import { type NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

import { DOCUMENT_MAX_BYTES } from '@/components/MaterialsBuilder/constants';
import {
  isLessonDocumentMimeType,
  LESSON_DOCUMENTS_BUCKET,
  lessonDocumentExtension,
} from '@/lib/lessonDocuments';
import { logger } from '@/lib/logger';

import { rateLimit } from '../../_lib/rateLimit';
import { requireOrganizerAccount } from '../../_lib/requireOrganizerAccount';
import { getServiceSupabase } from '../_lib/serviceSupabase';

// The document never passes through this function — it goes browser → Storage
// via the signed URL minted here, clear of Vercel's ~4.5 MB request body limit.
const RATE_LIMIT = { windowMs: 60_000, max: 20 };

const SWEEP_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Nothing points at an uploaded document once its plan is generated, so this is
 * the whole cleanup story: the owner's next mint deletes their day-old objects.
 */
async function sweepStaleDocuments(organizerId: string) {
  try {
    const sb = getServiceSupabase();
    const { data } = await sb.storage.from(LESSON_DOCUMENTS_BUCKET).list(organizerId);
    const cutoff = Date.now() - SWEEP_MAX_AGE_MS;
    const stale = (data ?? [])
      .filter((object) => object.created_at && Date.parse(object.created_at) < cutoff)
      .map((object) => `${organizerId}/${object.name}`);
    if (stale.length > 0) {
      await sb.storage.from(LESSON_DOCUMENTS_BUCKET).remove(stale);
    }
  } catch (err) {
    logger.info('Lesson document sweep skipped', {
      route: 'POST /api/group/lesson-documents',
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/** POST — mint a signed upload URL for one reference document. */
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, RATE_LIMIT);
  if (limited) return limited;

  const orgCheck = await requireOrganizerAccount(req);
  if (orgCheck instanceof NextResponse) return orgCheck;

  try {
    const body = await req.json().catch(() => null);
    const mimeType = (body ?? {}).mimeType;
    if (!isLessonDocumentMimeType(mimeType)) {
      return NextResponse.json(
        { error: 'Only PDF and plain text files can be attached.' },
        { status: 400 },
      );
    }

    await sweepStaleDocuments(orgCheck.id);

    const path = `${orgCheck.id}/${uuidv4()}.${lessonDocumentExtension(mimeType)}`;
    const { data, error } = await getServiceSupabase()
      .storage.from(LESSON_DOCUMENTS_BUCKET)
      .createSignedUploadUrl(path);

    if (error || !data) {
      logger.error('Failed to create signed upload URL', {
        route: 'POST /api/group/lesson-documents',
        error: error?.message,
      });
      return NextResponse.json({ error: 'Failed to prepare the upload.' }, { status: 500 });
    }

    return NextResponse.json({ path, token: data.token, maxBytes: DOCUMENT_MAX_BYTES });
  } catch (err) {
    logger.error('Unhandled error', {
      route: 'POST /api/group/lesson-documents',
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Failed to prepare the upload.' }, { status: 500 });
  }
}

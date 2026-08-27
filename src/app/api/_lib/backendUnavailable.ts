import { NextResponse } from 'next/server';

import type { DataError } from '@/lib/dataError';
import { logger } from '@/lib/logger';

/**
 * Not 401: a dead database made every gated route report a rejected session,
 * and the client told signed-in users to sign in again.
 */
export function backendUnavailable(error: DataError, where: string): NextResponse {
  logger.error('Auth lookup failed', {
    where,
    kind: error.kind,
    status: error.status,
    code: error.code,
  });
  return NextResponse.json({ error: 'Backend unavailable.' }, { status: 503 });
}

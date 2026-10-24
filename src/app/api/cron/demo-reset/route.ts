import { type NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

import { isAuthorizedCron } from '../../_lib/cronAuth';
import { getServiceSupabase } from '../../group/_lib/serviceSupabase';
import { resetDemo } from './resetDemo';

/** Writes to every demo user's data — must never be prerendered or cached. */
export const dynamic = 'force-dynamic';

/** GET — nightly rebuild of the demo teacher, demo group and demo learners. */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DEMO_PASSWORD) {
    logger.error('DEMO_PASSWORD is not set — refusing to run demo reset');
    return NextResponse.json({ error: 'DEMO_PASSWORD is not set.' }, { status: 500 });
  }

  try {
    const result = await resetDemo(getServiceSupabase(), new Date());
    return NextResponse.json(result);
  } catch (err) {
    logger.error('Demo reset failed', {
      route: '/api/cron/demo-reset',
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Demo reset failed.' }, { status: 500 });
  }
}

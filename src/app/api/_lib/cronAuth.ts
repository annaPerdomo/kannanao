import { timingSafeEqual } from 'node:crypto';

import type { NextRequest } from 'next/server';

import { logger } from '@/lib/logger';

/**
 * Vercel sends `authorization: Bearer ${CRON_SECRET}` automatically once the env
 * var is set. Fails closed: with no secret configured, nothing is authorized —
 * an unprotected endpoint that writes to every user is worse than a broken one.
 */
export function isAuthorizedCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    logger.error('CRON_SECRET is not set — refusing to run cron route', {
      route: req.nextUrl.pathname,
    });
    return false;
  }

  const provided = Buffer.from(req.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  // timingSafeEqual throws on a length mismatch, so check that first.
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

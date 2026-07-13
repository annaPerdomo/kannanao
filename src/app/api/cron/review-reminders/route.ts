import { timingSafeEqual } from 'node:crypto';

import { type NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import {
  dateStringInTimeZone,
  type ReminderCandidate,
  selectReminders,
} from '@/lib/reviewReminder';

import { type PushSubscriptionRow, sendPushToSubscriptions } from '../../_lib/sendPushNotification';
import { getServiceSupabase } from '../../group/_lib/serviceSupabase';

/** Reads the whole user base — must never be prerendered or cached. */
export const dynamic = 'force-dynamic';

/**
 * Devices notified concurrently. The batch is one class, not a mailing list, so
 * this exists to bound the fan-out to the push services rather than to go fast.
 */
const SEND_CONCURRENCY = 10;

/**
 * Vercel sends `authorization: Bearer ${CRON_SECRET}` automatically once the env
 * var is set. Fails closed: with no secret configured, nothing is authorized —
 * an unprotected endpoint that pushes to every user is worse than a broken one.
 */
function isAuthorizedCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    logger.error('CRON_SECRET is not set — refusing to run review reminders');
    return false;
  }

  const provided = Buffer.from(req.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  // timingSafeEqual throws on a length mismatch, so check that first.
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

interface CandidateRow {
  user_id: string;
  due_count: number;
  reminders_enabled: boolean;
  last_study_date: string | null;
  last_reminder_date: string | null;
  streak_days: number;
}

/**
 * GET — the daily review-due reminder. Sends at most one push per user per day,
 * and only to users who have cards due, have not studied yet today, and have the
 * reminder switched on. Scheduled from vercel.json.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sb = getServiceSupabase();
  const today = dateStringInTimeZone(new Date());

  // Query 1 of 2: every user with a device, their due count, streak and dates.
  const { data, error } = await sb.rpc('review_reminder_candidates');
  if (error) {
    logger.error('Review reminders: candidate query failed', { error: error.message });
    return NextResponse.json({ error: 'Failed to load candidates.' }, { status: 500 });
  }

  const candidates: ReminderCandidate[] = ((data ?? []) as CandidateRow[]).map((row) => ({
    userId: row.user_id,
    dueCount: Number(row.due_count),
    remindersEnabled: row.reminders_enabled,
    lastStudyDate: row.last_study_date,
    lastReminderDate: row.last_reminder_date,
    streakDays: row.streak_days,
  }));

  const { send, skipped } = selectReminders(candidates, today);

  if (!send.length) {
    logger.info('Review reminders: nothing to send', {
      candidates: candidates.length,
      sent: 0,
      skipped,
    });
    return NextResponse.json({ candidates: candidates.length, sent: 0, skipped });
  }

  // Query 2 of 2: the devices of exactly the users being notified.
  const userIds = send.map((s) => s.userId);
  const { data: subs, error: subsError } = await sb
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
    .in('user_id', userIds);

  if (subsError) {
    logger.error('Review reminders: subscription query failed', { error: subsError.message });
    return NextResponse.json({ error: 'Failed to load subscriptions.' }, { status: 500 });
  }

  const devicesByUser = new Map<string, PushSubscriptionRow[]>();
  for (const sub of (subs ?? []) as PushSubscriptionRow[]) {
    const list = devicesByUser.get(sub.user_id);
    if (list) list.push(sub);
    else devicesByUser.set(sub.user_id, [sub]);
  }

  const delivered: string[] = [];
  let sent = 0;
  let failed = 0;
  let pruned = 0;

  for (let i = 0; i < send.length; i += SEND_CONCURRENCY) {
    const batch = send.slice(i, i + SEND_CONCURRENCY);
    const results = await Promise.all(
      batch.map(async ({ userId, payload }) => {
        // The user unsubscribed between the two queries — nothing to send.
        const devices = devicesByUser.get(userId);
        if (!devices?.length) return null;
        const result = await sendPushToSubscriptions(devices, payload);
        return { userId, result };
      }),
    );

    for (const entry of results) {
      if (!entry) continue;
      sent += entry.result.sent;
      failed += entry.result.failed;
      pruned += entry.result.pruned;
      // Only a user who actually got the notification is marked as reminded. A
      // user whose every device failed stays eligible, so a transient outage
      // does not silently cost them the day's nudge.
      if (entry.result.sent > 0) delivered.push(entry.userId);
    }
  }

  if (delivered.length) {
    // The once-per-day guard. Written after delivery, in one statement.
    const { error: markError } = await sb
      .from('user_progress')
      .update({ last_reminder_date: today })
      .in('user_id', delivered);

    if (markError) {
      // Non-fatal, but it means a re-run today could notify these users twice.
      logger.error('Review reminders: failed to record last_reminder_date', {
        error: markError.message,
        users: delivered.length,
      });
    }
  }

  logger.info('Review reminders sent', {
    candidates: candidates.length,
    notified: delivered.length,
    sent,
    failed,
    pruned,
    skipped,
  });

  return NextResponse.json({
    candidates: candidates.length,
    notified: delivered.length,
    sent,
    failed,
    pruned,
    skipped,
  });
}

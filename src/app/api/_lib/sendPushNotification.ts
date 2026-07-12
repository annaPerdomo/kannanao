import webpush from 'web-push';

import { logger } from '@/lib/logger';

import { getServiceSupabase } from '../group/_lib/serviceSupabase';

const vapidSubject = process.env.VAPID_SUBJECT;
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

let configured = false;
let disabled = false;

function ensureConfigured() {
  if (configured) return true;
  if (disabled) return false;
  if (!vapidSubject || !vapidPublicKey || !vapidPrivateKey) {
    logger.info('VAPID keys not configured — push notifications disabled');
    disabled = true;
    return false;
  }
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  configured = true;
  return true;
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/** One registered device. `user_id` is carried so a prune deletes the right row. */
export interface PushSubscriptionRow {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushSendResult {
  sent: number;
  failed: number;
  /** Dead endpoints deleted from push_subscriptions this call. */
  pruned: number;
}

/** A subscription the push service says is gone for good — safe to delete. */
function isDeadEndpoint(reason: unknown): boolean {
  if (!reason || typeof reason !== 'object' || !('statusCode' in reason)) return false;
  const status = (reason as { statusCode: number }).statusCode;
  // 410 Gone is the spec answer; FCM and Mozilla return 404 for the same thing.
  return status === 410 || status === 404;
}

/**
 * Send one payload to an explicit list of subscriptions, which may span users,
 * and prune the endpoints the push service reports as dead.
 *
 * Takes the rows rather than a user id so a batch job (the daily reminder cron)
 * can fetch every device in one query instead of one query per user. Never
 * throws for a delivery failure — one dead device must not stop the batch.
 */
export async function sendPushToSubscriptions(
  subs: PushSubscriptionRow[],
  payload: PushPayload & { badgeCount?: number },
): Promise<PushSendResult> {
  if (!ensureConfigured() || !subs.length) return { sent: 0, failed: 0, pruned: 0 };

  const sb = getServiceSupabase();
  const body = JSON.stringify(payload);

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        body,
      ),
    ),
  );

  const result: PushSendResult = { sent: 0, failed: 0, pruned: 0 };

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === 'fulfilled') {
      result.sent += 1;
      continue;
    }

    result.failed += 1;

    if (isDeadEndpoint(r.reason)) {
      await sb
        .from('push_subscriptions')
        .delete()
        .eq('user_id', subs[i].user_id)
        .eq('endpoint', subs[i].endpoint);
      result.pruned += 1;
      logger.info('Removed expired push subscription', { endpoint: subs[i].endpoint });
    } else {
      logger.error('Push notification failed', {
        endpoint: subs[i].endpoint,
        error: String(r.reason),
      });
    }
  }

  return result;
}

/**
 * Send a push notification to all of a user's subscribed devices.
 * Silently skips if VAPID keys are not configured or user has no subscriptions.
 * Cleans up expired subscriptions automatically.
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!ensureConfigured()) return;

  const sb = getServiceSupabase();
  const { data: subs } = await sb
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId);

  if (!subs?.length) return;

  // Carry the recipient's total unread count so the service worker can set the
  // app-icon badge. iOS home-screen web apps only badge from the push payload
  // this way; Android badges from the notification itself. The triggering
  // message is already inserted by the time this runs, so it's counted.
  const { count, error: countError } = await sb
    .from('direct_messages')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .is('read_at', null);

  // On a count error `count` is null — omit badgeCount entirely rather than
  // sending 0, which would wrongly clear the badge. The service worker leaves
  // the existing badge untouched when badgeCount is absent.
  const badgeCount = countError ? undefined : (count ?? 0);

  await sendPushToSubscriptions(
    subs.map((sub) => ({ ...sub, user_id: userId })),
    { ...payload, badgeCount },
  );
}

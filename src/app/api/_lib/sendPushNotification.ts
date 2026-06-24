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

/**
 * Send a push notification to all of a user's subscribed devices.
 * Silently skips if VAPID keys are not configured or user has no subscriptions.
 * Cleans up expired (410 Gone) subscriptions automatically.
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
  const body = JSON.stringify({ ...payload, badgeCount });

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        body,
      ),
    ),
  );

  // Clean up expired/invalid subscriptions (410 Gone)
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (
      r.status === 'rejected' &&
      r.reason &&
      typeof r.reason === 'object' &&
      'statusCode' in r.reason &&
      (r.reason as { statusCode: number }).statusCode === 410
    ) {
      await sb
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', subs[i].endpoint);
      logger.info('Removed expired push subscription', { endpoint: subs[i].endpoint });
    } else if (r.status === 'rejected') {
      logger.error('Push notification failed', {
        endpoint: subs[i].endpoint,
        error: String(r.reason),
      });
    }
  }
}

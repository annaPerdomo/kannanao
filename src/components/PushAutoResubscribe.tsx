'use client';

import { usePushNotifications } from '@/hooks/usePushNotifications';

/**
 * Mount-only component that re-establishes the push subscription on app
 * launch. iOS silently drops subscriptions when the PWA is killed, and the
 * recovery logic in usePushNotifications only runs where the hook is mounted —
 * this makes it run on every page, not just /notifications.
 */
export function PushAutoResubscribe() {
  usePushNotifications();
  return null;
}

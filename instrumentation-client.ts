import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.NODE_ENV === 'production',
  environment: process.env.NODE_ENV,

  // Capture 10% of transactions for performance monitoring
  tracesSampleRate: 0.1,

  // Capture replays only when an error occurs
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.05,

  integrations: [Sentry.replayIntegration()],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

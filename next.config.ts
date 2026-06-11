import withPWA, { runtimeCaching as defaultCache } from '@ducanh2912/next-pwa';
import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/landing',
        destination: '/',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        // Security headers for all routes
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=()',
          },
        ],
      },
      {
        // Prevent framing on non-embed routes
        source: '/((?!embed).*)',
        headers: [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }],
      },
      {
        // Allow /embed/* routes to be framed inside Canvas and other LMS platforms
        source: '/embed/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "frame-ancestors 'self'",
              'http://localhost:*',
              'https://localhost:*',
              'https://*.instructure.com',
              'https://*.canvas.net',
              'https://*.canvaslms.com',
            ].join(' '),
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.unsplash.com',
      },
    ],
  },
  env: {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    // The env files define VAPID_PUBLIC_KEY (no NEXT_PUBLIC_ prefix), but the
    // browser needs it inlined at build time to call pushManager.subscribe().
    NEXT_PUBLIC_VAPID_PUBLIC_KEY:
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY,
  },
};

// Serve Next.js JS chunks with StaleWhileRevalidate instead of the package
// default of CacheFirst. CacheFirst can strand a device after a deploy: the
// cached HTML shell references new content-hashed chunk filenames, but the old
// cache keeps serving stale chunks (or has none for the new hashes), so React
// never boots and the page renders blank (only the CSS background animates).
// StaleWhileRevalidate still serves the cache for speed but always refetches in
// the background, so the next load heals automatically.
const runtimeCaching = defaultCache.map((entry) =>
  entry.options?.cacheName === 'next-static-js-assets'
    ? { ...entry, handler: 'StaleWhileRevalidate' as const }
    : entry,
);

const pwaConfig = withPWA({
  dest: 'public',
  cacheOnFrontEndNav: true,
  // Disabled: aggressive nav caching widens the window where a stale shell is
  // paired with mismatched chunks after a deploy (the blank-screen failure).
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: false,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching,
  },
})(nextConfig);

export default withSentryConfig(pwaConfig, {
  // Source map uploads require SENTRY_AUTH_TOKEN + org/project — skipped here
  silent: true,
  telemetry: false,
});

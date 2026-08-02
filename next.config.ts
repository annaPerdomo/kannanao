import withPWA, { runtimeCaching as defaultCache } from '@ducanh2912/next-pwa';
import bundleAnalyzer from '@next/bundle-analyzer';
import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// Gated behind ANALYZE=true so it's a no-op for normal builds.
// Run `pnpm bundle:analyze` to open the treemap report.
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });

// Points next-intl at the per-request config (locale + messages). It only wires
// the module up — it adds no middleware and no [locale] URL segment, so routes
// that never touch a next-intl server API (the landing page) stay static.
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  experimental: {
    // Tree-shake barrel imports (`import { Box, Button } from '@mui/material'`)
    // down to the modules actually used, trimming shared First Load JS.
    optimizePackageImports: ['@mui/material', '@mui/icons-material', '@mui/x-date-pickers'],
  },
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
        // Never serve a stale service worker: right after a deploy, a CDN-cached
        // sw.js precaches the previous build's hashed chunks, which 404 and
        // abort the service worker install.
        source: '/sw.js',
        headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }],
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
  // Chat stickers are ~670 KB across 35 files. Precaching them would put that
  // on the service-worker install path for every user, including everyone who
  // never opens a chat. They're fetched on demand instead and kept by the
  // runtime `static-image-assets` cache after first use.
  //
  // The hero banners' @2x variants (~290 KB across 3 files) are excluded for the
  // same reason and then some: they are only ever requested by a large retina
  // screen, so precaching them bills every phone on mobile data for pixels that
  // device will never ask for. The 1x bands and the phone cards stay precached —
  // those are the ones on the critical path for the home screen.
  // Study-buddy art (~920 KB across 81 files) is excluded on the same grounds.
  // Login backgrounds (~350 KB) and the landing's hero artwork (~210 KB) only
  // matter to signed-out visitors, who by definition haven't installed the PWA.
  publicExcludes: [
    '!noprecache/**/*',
    '!stickers/**/*',
    '!mascot/*@2x.webp',
    '!buddies/**/*',
    '!login/**/*',
    '!landing/**/*',
  ],
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching,
    // Replaces next-pwa's default excludes, so the first three entries
    // re-state them (fonts, sourcemaps, manifest*.js).
    exclude: [
      /\/_next\/static\/.*(?<!\.p)\.woff2/,
      /\.map$/,
      /^manifest.*\.js$/,
      // Next 15.2+ emits this build asset but never serves it — the 404
      // during precache aborts the entire service worker install, which
      // breaks offline caching and push notifications for every device.
      /dynamic-css-manifest\.json$/,
    ],
  },
})(withNextIntl(nextConfig));

export default withBundleAnalyzer(
  withSentryConfig(pwaConfig, {
    // Source map uploads require SENTRY_AUTH_TOKEN + org/project — skipped here
    silent: true,
    telemetry: false,
  }),
);

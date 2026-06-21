import type { MetadataRoute } from 'next';

// App-internal surfaces with no value to an anonymous crawler. Keeping bots off
// them avoids a dynamic SSR render on every hit.
const DISALLOWED_PATHS = [
  '/api/',
  '/admin',
  '/decks',
  '/deck/',
  '/group/',
  '/join/',
  '/notifications',
  '/ohanashikai',
  '/profile',
  '/settings',
  '/shop',
  '/stats',
  '/study',
];

// High-volume crawlers that bring no benefit to a small family app but still
// cost a server render on every page they fetch: SEO/backlink tools and
// AI-training scrapers. Real search engines (Googlebot, Bingbot, DuckDuckBot,
// Applebot) and social link-preview bots are intentionally NOT blocked, so
// search ranking and shared-link previews keep working.
const BLOCKED_BOTS = [
  // SEO / backlink crawlers
  'AhrefsBot',
  'SemrushBot',
  'MJ12bot',
  'DotBot',
  'DataForSeoBot',
  'BLEXBot',
  'rogerbot',
  'Barkrowler',
  'PetalBot',
  'serpstatbot',
  'ZoominfoBot',
  // AI-training / AI-scraper bots
  'GPTBot',
  'ClaudeBot',
  'anthropic-ai',
  'CCBot',
  'Google-Extended',
  'Applebot-Extended',
  'Bytespider',
  'Amazonbot',
  'Diffbot',
  'Omgilibot',
  'ImagesiftBot',
  'meta-externalagent',
  'PerplexityBot',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: DISALLOWED_PATHS },
      // Greedy, no-value crawlers: block them from the whole site.
      { userAgent: BLOCKED_BOTS, disallow: '/' },
    ],
    sitemap: 'https://www.kannanao.com/sitemap.xml',
  };
}

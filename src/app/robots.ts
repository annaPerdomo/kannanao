import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/admin',
        '/decks',
        '/deck/',
        '/group/',
        '/join/',
        '/ohanashikai',
        '/profile',
        '/settings',
        '/shop',
        '/stats',
        '/study',
        '/travel',
      ],
    },
    sitemap: 'https://www.kannanao.com/sitemap.xml',
  };
}

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
        '/embed/',
        '/group/',
        '/join/',
        '/ohanashikai',
        '/profile',
        '/settings',
        '/shop',
        '/stats',
        '/study',
      ],
    },
    sitemap: 'https://kannanao.com/sitemap.xml',
  };
}

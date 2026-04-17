import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/decks', '/study', '/stats', '/profile', '/api'],
    },
    sitemap: 'https://kannanao.com/sitemap.xml',
  }
}

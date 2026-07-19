import { createClient } from '@supabase/supabase-js';
import type { MetadataRoute } from 'next';

import { APP_URL } from '@/lib/brand';

const BASE = APP_URL;

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';
  if (!url || !key) return null;
  return createClient(url, key);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      // The Japanese landing is its own URL (`/` is language-picked per visitor
      // by the middleware), so it needs its own sitemap entry to be discovered.
      url: `${BASE}/landing/ja`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE}/travel`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE}/travel/food`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE}/travel/phrases`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE}/travel/katakana`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE}/travel/heard`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE}/travel/culture`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];

  // Add public embed routes for all public decks
  const client = getServerSupabase();
  if (client) {
    try {
      const { data: decks } = await client
        .from('decks')
        .select('id, updated_at')
        .eq('is_public', true)
        .order('updated_at', { ascending: false });

      if (decks) {
        for (const deck of decks) {
          staticRoutes.push({
            url: `${BASE}/embed/deck/${deck.id}`,
            lastModified: new Date(deck.updated_at),
            changeFrequency: 'weekly',
            priority: 0.6,
          });
        }
      }
    } catch {
      // Supabase unavailable at build time — skip dynamic routes
    }
  }

  return staticRoutes;
}

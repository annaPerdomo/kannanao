import { createClient } from '@supabase/supabase-js';
import type { MetadataRoute } from 'next';

const BASE = 'https://www.kannanao.com';

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
      url: `${BASE}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
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

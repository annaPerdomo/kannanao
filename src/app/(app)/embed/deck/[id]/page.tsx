import { createClient } from '@supabase/supabase-js';
import type { Metadata } from 'next';
import { use } from 'react';

import PublicStudyViewer from '@/components/PublicStudyViewer';
import { APP_NAME, APP_URL } from '@/lib/brand';

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  const client = getServerSupabase();
  if (!client) return {};

  const { data: deck } = await client
    .from('decks')
    .select('name, description, emoji')
    .eq('id', id)
    .eq('is_public', true)
    .single();

  if (!deck) return {};

  const { count } = await client
    .from('cards')
    .select('id', { count: 'exact', head: true })
    .eq('deck_id', id);

  const title = `${deck.emoji ?? '📚'} ${deck.name} — ${APP_NAME}`;
  const description =
    deck.description ||
    (count != null
      ? `Study ${count} Japanese flashcard${count !== 1 ? 's' : ''} from the "${deck.name}" deck on ${APP_NAME}.`
      : `Study Japanese flashcards from the "${deck.name}" deck on ${APP_NAME}.`);

  return {
    title,
    description,
    alternates: {
      canonical: `/embed/deck/${id}`,
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${APP_URL}/embed/deck/${id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default function EmbedDeckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <PublicStudyViewer deckId={id} />;
}

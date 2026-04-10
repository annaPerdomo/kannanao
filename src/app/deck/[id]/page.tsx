'use client';
import { use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Deck from '@/pages/Deck';

export default function DeckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const backPath = searchParams?.get('from') === 'home' ? '/' : '/decks';

  return (
    <Deck
      deckId={id}
      onBack={() => router.push(backPath)}
      onStudy={() => router.push(`/deck/${id}/study`)}
      onPractice={(mode) => router.push(`/deck/${id}/practice/${mode}`)}
    />
  );
}

'use client';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { Deck } from '@/pages/Deck';

export default function DeckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  return (
    <Deck
      deckId={id}
      onBack={() => router.push('/')}
      onStudy={() => router.push(`/deck/${id}/study`)}
      onPractice={(mode) => router.push(`/deck/${id}/practice/${mode}`)}
    />
  );
}
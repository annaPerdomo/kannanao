'use client';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import Study from '@/pages/Study';

export default function StudyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  return (
    <Study
      deckId={id}
      onBack={() => router.push(`/deck/${id}`)}
    />
  );
}
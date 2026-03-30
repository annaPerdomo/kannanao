'use client';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import Practice from '@/pages/Practice';
import type { PracticeMode } from '@/types/app';

const VALID_MODES: PracticeMode[] = ['match', 'fill', 'recall'];

export default function PracticePage({ params }: { params: Promise<{ id: string; mode: string }> }) {
  const { id, mode } = use(params);
  const router = useRouter();

  if (!VALID_MODES.includes(mode as PracticeMode)) {
    router.replace(`/deck/${id}`);
    return null;
  }

  return (
    <Practice
      deckId={id}
      mode={mode as PracticeMode}
      onBack={() => router.back()}
    />
  );
}
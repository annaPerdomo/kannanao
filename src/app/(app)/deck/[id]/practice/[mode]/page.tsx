'use client';
import { useRouter } from 'next/navigation';
import { use } from 'react';

import { PRACTICE_CONFIG } from '@/components/Deck/constants';
import Practice from '@/pages/Practice';
import type { PracticeMode } from '@/types/app';

// Derived from the picker's own tiles, so a new mode can never be reachable on
// the deck page but rejected by its route.
const VALID_MODES: PracticeMode[] = PRACTICE_CONFIG.map((tile) => tile.mode);

export default function PracticePage({
  params,
}: {
  params: Promise<{ id: string; mode: string }>;
}) {
  const { id, mode } = use(params);
  const router = useRouter();

  if (!VALID_MODES.includes(mode as PracticeMode)) {
    router.replace(`/deck/${id}`);
    return null;
  }

  return <Practice deckId={id} mode={mode as PracticeMode} onBack={() => router.back()} />;
}

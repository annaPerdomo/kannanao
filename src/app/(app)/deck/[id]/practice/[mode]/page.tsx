'use client';
import { useRouter } from 'next/navigation';
import { use } from 'react';

import { QuestFinishScreen, QuestStepBanner } from '@/components/AssignmentQuest';
import { PRACTICE_CONFIG } from '@/components/Deck/constants';
import { QuestHandoffProvider } from '@/contexts/QuestHandoffContext';
import { usePracticeChain } from '@/hooks/usePracticeChain';
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
  const valid = VALID_MODES.includes(mode as PracticeMode);
  const chain = usePracticeChain({ deckId: id, mode: mode as PracticeMode });

  if (!valid) {
    router.replace(`/deck/${id}`);
    return null;
  }

  if (chain?.phase === 'finish' && chain.state.assignmentId) {
    return (
      <QuestFinishScreen
        assignmentId={chain.state.assignmentId}
        onRetry={chain.retry}
        onDone={chain.goHome}
      />
    );
  }

  return (
    <QuestHandoffProvider value={chain?.handoff ?? null}>
      <Practice
        key={chain?.attempt ?? 0}
        deckId={id}
        mode={mode as PracticeMode}
        onBack={chain ? chain.abandon : () => router.back()}
        cardIds={chain?.cardIds}
        questBanner={
          chain ? <QuestStepBanner legs={chain.legs} currentIndex={chain.index} /> : null
        }
      />
    </QuestHandoffProvider>
  );
}

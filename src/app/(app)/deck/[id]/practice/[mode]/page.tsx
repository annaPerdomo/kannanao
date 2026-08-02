'use client';
import { useRouter } from 'next/navigation';
import { use } from 'react';

import { QuestFinishScreen, QuestStepBanner } from '@/components/AssignmentQuest';
import { PRACTICE_CONFIG } from '@/components/Deck/constants';
import { QuestHandoffProvider } from '@/contexts/QuestHandoffContext';
import { useAssignmentQuest } from '@/hooks/useAssignmentQuest';
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
  const quest = useAssignmentQuest({ deckId: id, mode: mode as PracticeMode });

  if (!valid) {
    router.replace(`/deck/${id}`);
    return null;
  }

  if (quest?.phase === 'finish') {
    return (
      <QuestFinishScreen
        assignmentId={quest.state.assignmentId}
        onRetry={quest.retry}
        onDone={quest.goHome}
      />
    );
  }

  return (
    <QuestHandoffProvider value={quest?.handoff ?? null}>
      <Practice
        key={quest?.attempt ?? 0}
        deckId={id}
        mode={mode as PracticeMode}
        onBack={quest ? quest.abandon : () => router.back()}
        questBanner={
          quest ? <QuestStepBanner legs={quest.legs} currentIndex={quest.index} /> : null
        }
      />
    </QuestHandoffProvider>
  );
}

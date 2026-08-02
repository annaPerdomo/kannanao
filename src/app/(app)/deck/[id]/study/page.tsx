'use client';
import { useRouter } from 'next/navigation';
import { use } from 'react';

import { QuestFinishScreen, QuestStepBanner } from '@/components/AssignmentQuest';
import { QuestHandoffProvider } from '@/contexts/QuestHandoffContext';
import { usePracticeChain } from '@/hooks/usePracticeChain';
import Study from '@/pages/Study';

export default function StudyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const chain = usePracticeChain({ deckId: id, mode: 'study' });

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
      <Study
        key={chain?.attempt ?? 0}
        deckId={id}
        onBack={chain ? chain.abandon : () => router.push(`/deck/${id}`)}
        cardIds={chain?.state.cardIds ?? undefined}
        questBanner={
          chain ? <QuestStepBanner legs={chain.legs} currentIndex={chain.index} /> : null
        }
      />
    </QuestHandoffProvider>
  );
}

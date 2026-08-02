'use client';
import { useRouter } from 'next/navigation';
import { use } from 'react';

import { QuestFinishScreen, QuestStepBanner } from '@/components/AssignmentQuest';
import { QuestHandoffProvider } from '@/contexts/QuestHandoffContext';
import { useAssignmentQuest } from '@/hooks/useAssignmentQuest';
import Study from '@/pages/Study';

export default function StudyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const quest = useAssignmentQuest({ deckId: id, mode: 'study' });

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
      <Study
        key={quest?.attempt ?? 0}
        deckId={id}
        onBack={quest ? quest.abandon : () => router.push(`/deck/${id}`)}
        questBanner={
          quest ? <QuestStepBanner legs={quest.legs} currentIndex={quest.index} /> : null
        }
      />
    </QuestHandoffProvider>
  );
}

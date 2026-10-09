'use client';
import type { HandoutRef } from '@/types/handout';

import { GroupWordList } from './GroupWordList';
import { KanaSetList } from './KanaSetList';
import { LearnerWordList } from './LearnerWordList';
import { WordList } from './WordList';

export interface ViewMember {
  id: string;
  name: string;
}

interface HandoutBodyProps {
  handout: HandoutRef;
  groupId?: string | null;
  memberId?: string | null;
  memberName?: string | null;
  viewMember: ViewMember | null;
  onPickLearner: (member: ViewMember) => void;
  onBackToGroup: () => void;
  isDraft?: boolean;
}

export function HandoutBody({
  handout,
  groupId,
  memberId,
  memberName,
  viewMember,
  onPickLearner,
  onBackToGroup,
  isDraft = false,
}: HandoutBodyProps) {
  if (!handout.deckId) {
    return handout.kanaSet ? <KanaSetList kanaSet={handout.kanaSet} /> : null;
  }

  if (isDraft) return <WordList deckId={handout.deckId} />;

  const effectiveMemberId = memberId ?? viewMember?.id ?? null;
  const effectiveMemberName = memberName ?? viewMember?.name ?? null;

  if (groupId && effectiveMemberId && effectiveMemberName) {
    return (
      <LearnerWordList
        groupId={groupId}
        deckId={handout.deckId}
        memberId={effectiveMemberId}
        memberName={effectiveMemberName}
        requiredMode={handout.requiredMode}
        onBack={viewMember ? onBackToGroup : undefined}
      />
    );
  }

  if (groupId) {
    return (
      <GroupWordList groupId={groupId} deckId={handout.deckId} onPickLearner={onPickLearner} />
    );
  }

  return <WordList deckId={handout.deckId} />;
}

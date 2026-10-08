'use client';
import type { Assignment } from '@/hooks/useAssignments';
import type { DifficultWord } from '@/hooks/useDifficultWords';
import type { FeedItem, GroupMember } from '@/hooks/useGroup';
import type { GroupActivity } from '@/hooks/useGroupActivity';
import type { LeaderboardEntry } from '@/hooks/useGroupLeaderboard';
import type { LessonLibraryHook } from '@/hooks/useLessonLibrary';
import type { DataError } from '@/lib/dataError';
import type { Deck } from '@/types/deck';

import type { AssignmentBatch } from '../AssignmentsList';
import type { GroupDashboardTab } from './constants';
import { LearnersTab } from './LearnersTab';
import { LessonsTab } from './LessonsTab';
import { TodayTab } from './TodayTab';
import { WordsTab } from './WordsTab';

interface TabContentProps {
  tab: GroupDashboardTab;
  groupId: string;
  library: LessonLibraryHook;
  members: GroupMember[];
  activity: GroupActivity | null;
  activityLoading: boolean;
  activityError: string | null;
  words: DifficultWord[] | undefined;
  wordsLoading: boolean;
  wordsError: string | null;
  assignments: Assignment[];
  assignmentsLoading: boolean;
  assignmentsError: string | null;
  ownDecks: Deck[];
  canAssign: boolean;
  onNavigateTab: (tab: GroupDashboardTab) => void;
  onViewPlan: () => void;
  onAssignDeck: (deckId: string) => void;
  feed: FeedItem[];
  feedLoading: boolean;
  feedError?: DataError | null;
  leaderboard: LeaderboardEntry[];
  leaderboardLoading: boolean;
  leaderboardError?: DataError | null;
  leaderboardVisible: boolean;
  onLeaderboardVisibilityChange: (visible: boolean) => void;
  onSelectMember: (memberId: string) => void;
  onSendEncouragement: (memberId: string, message: string, emoji?: string) => Promise<unknown>;
  onEditAssignments: (
    ids: string[],
    updates: { note?: string | null; dueDate?: string | null; availableOn?: string | null },
  ) => Promise<void>;
  onDeleteAssignments: (ids: string[]) => Promise<void>;
  onAssign: () => void;
  onAssignMissing: (batch: AssignmentBatch, memberIds: string[]) => void;
  onBuild: () => void;
  onLibraryChanged: () => void;
}

export function TabContent({
  tab,
  groupId,
  library,
  members,
  activity,
  activityLoading,
  activityError,
  words,
  wordsLoading,
  wordsError,
  assignments,
  assignmentsLoading,
  assignmentsError,
  ownDecks,
  canAssign,
  onNavigateTab,
  onViewPlan,
  onAssignDeck,
  feed,
  feedLoading,
  feedError,
  leaderboard,
  leaderboardLoading,
  leaderboardError,
  leaderboardVisible,
  onLeaderboardVisibilityChange,
  onSelectMember,
  onSendEncouragement,
  onEditAssignments,
  onDeleteAssignments,
  onAssign,
  onAssignMissing,
  onBuild,
  onLibraryChanged,
}: TabContentProps) {
  if (tab === 'today') {
    return (
      <TodayTab
        groupId={groupId}
        members={members}
        activity={activity}
        activityLoading={activityLoading}
        activityError={activityError}
        words={words}
        wordsLoading={wordsLoading}
        wordsError={wordsError}
        assignments={assignments}
        assignmentsLoading={assignmentsLoading}
        assignmentsError={assignmentsError}
        ownDecks={ownDecks}
        canAssign={canAssign}
        onNavigateTab={onNavigateTab}
        onViewPlan={onViewPlan}
        onBuild={onBuild}
        onAssignDeck={onAssignDeck}
        onSelectMember={onSelectMember}
        onSendEncouragement={onSendEncouragement}
        feed={feed}
        feedLoading={feedLoading}
        feedError={feedError}
      />
    );
  }

  if (tab === 'lessons') {
    return (
      <LessonsTab
        groupId={groupId}
        library={library}
        assignments={assignments}
        assignmentsLoading={assignmentsLoading}
        assignmentsError={assignmentsError}
        onEditAssignments={onEditAssignments}
        onDeleteAssignments={onDeleteAssignments}
        canAssign={canAssign}
        onAssign={onAssign}
        ownDecks={ownDecks}
        onSendEncouragement={onSendEncouragement}
        members={members}
        onAssignMissing={onAssignMissing}
        onBuild={onBuild}
        onChanged={onLibraryChanged}
      />
    );
  }

  if (tab === 'learners') {
    return (
      <LearnersTab
        members={members}
        leaderboard={leaderboard}
        leaderboardLoading={leaderboardLoading}
        leaderboardError={leaderboardError}
        leaderboardVisible={leaderboardVisible}
        onLeaderboardVisibilityChange={onLeaderboardVisibilityChange}
        onSelectMember={onSelectMember}
        onSendEncouragement={onSendEncouragement}
      />
    );
  }

  return <WordsTab groupId={groupId} />;
}

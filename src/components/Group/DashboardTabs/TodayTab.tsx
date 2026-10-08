'use client';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { DataErrorState } from '@/components/DataErrorState';
import { sumLastDays } from '@/components/Group/activityWeek';
import { Loading } from '@/components/Loading';
import type { Assignment } from '@/hooks/useAssignments';
import type { DifficultWord } from '@/hooks/useDifficultWords';
import type { FeedItem } from '@/hooks/useGroup';
import type { GroupMember } from '@/hooks/useGroup';
import type { GroupActivity } from '@/hooks/useGroupActivity';
import type { DataError } from '@/lib/dataError';
import type { Deck } from '@/types/deck';

import { ActivityFeed } from '../ActivityFeed';
import { DeckReadinessPanel } from '../DeckReadiness';
import {
  type ActivityRangeDays,
  DailyActivityChart,
  DailyRangeSelect,
  GroupModeBreakdown,
  StudyHeatmap,
} from '../GroupCharts';
import { MaterialsProgress } from '../MaterialsProgress';
import { NeedsAttention } from '../NeedsAttention';
import { PracticeStrength } from '../PracticeStrength';
import { ReteachNext } from '../ReteachNext';
import { SectionCard } from '../SectionCard';
import { WeekStatStrip } from '../WeekStatStrip';
import type { GroupDashboardTab } from './constants';

interface TodayTabProps {
  groupId: string;
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
  onBuild: () => void;
  onAssignDeck: (deckId: string) => void;
  onSelectMember: (memberId: string) => void;
  onSendEncouragement: (memberId: string, message: string, emoji?: string) => Promise<unknown>;
  feed: FeedItem[];
  feedLoading: boolean;
  feedError?: DataError | null;
}

/** Anything that is a whole tab of its own does not get a preview here. */
export function TodayTab({
  groupId,
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
  onBuild,
  onAssignDeck,
  onSelectMember,
  onSendEncouragement,
  feed,
  feedLoading,
  feedError,
}: TodayTabProps) {
  const theme = useTheme();
  const t = useTranslations('Group.groupPage');
  const tc = useTranslations('Group.charts');
  const [rangeDays, setRangeDays] = useState<ActivityRangeDays>(14);

  const studySecsThisWeek = sumLastDays(activity?.totals.durationSecs ?? []);

  // At xs the column wrappers dissolve (`display: contents`) so the `order`
  // values, not the JSX order, decide the single-column sequence. Weak practice
  // sits in the wide column only to keep the two sides near-level at lg.
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 3 } }}>
      <NeedsAttention
        groupId={groupId}
        members={members}
        assignments={assignments}
        assignmentsLoading={assignmentsLoading}
        assignmentsError={assignmentsError}
        words={words}
        wordsLoading={wordsLoading}
        wordsError={wordsError}
        onSelectMember={onSelectMember}
        onViewAssignments={onViewPlan}
        onViewLearners={() => onNavigateTab('learners')}
        onViewWords={() => onNavigateTab('words')}
        onSendEncouragement={onSendEncouragement}
      />

      <WeekStatStrip members={members} activity={activity} />

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 2.5 }}>
        <Box
          sx={{
            display: { xs: 'contents', lg: 'flex' },
            flexDirection: 'column',
            gap: 2.5,
            flex: { lg: 2 },
            minWidth: 0,
          }}
        >
          <Box sx={{ order: 0 }}>
            <SectionCard
              title={tc('dailyHeading')}
              action={<DailyRangeSelect value={rangeDays} onChange={setRangeDays} />}
            >
              {activityError ? (
                <Alert severity="error">{activityError}</Alert>
              ) : activityLoading && !activity ? (
                <Loading message={tc('loading')} />
              ) : (
                <DailyActivityChart
                  days={activity?.days ?? []}
                  values={activity?.totals.cards ?? []}
                  correct={activity?.totals.correct ?? []}
                />
              )}
            </SectionCard>
          </Box>

          <Box sx={{ order: 4 }}>
            <PracticeStrength activity={activity} loading={activityLoading} error={activityError} />
          </Box>

          <Box sx={{ order: 5 }}>
            <SectionCard
              icon={
                <CalendarMonthOutlinedIcon
                  aria-hidden
                  sx={{ fontSize: '1.15rem', color: theme.palette.brand[600] }}
                />
              }
              title={tc('heatmapHeading')}
            >
              {activityError ? (
                <Alert severity="error">{activityError}</Alert>
              ) : activityLoading && !activity ? (
                <Loading message={tc('loading')} />
              ) : (
                <StudyHeatmap
                  days={activity?.days ?? []}
                  members={activity?.members ?? []}
                  offset={0}
                  studySecsThisWeek={studySecsThisWeek}
                />
              )}
            </SectionCard>
          </Box>
        </Box>

        <Box
          sx={{
            display: { xs: 'contents', lg: 'flex' },
            flexDirection: 'column',
            gap: 2.5,
            flex: { lg: 1 },
            minWidth: 0,
          }}
        >
          <Box sx={{ order: 1 }}>
            <MaterialsProgress
              assignments={assignments}
              loading={assignmentsLoading}
              error={assignmentsError}
              ownDecks={ownDecks}
              canAssign={canAssign}
              onViewAssignments={onViewPlan}
              onAssignDeck={onAssignDeck}
              onOpenMaterials={onBuild}
            />
          </Box>

          <Box sx={{ order: 2 }}>
            <DeckReadinessPanel
              groupId={groupId}
              members={members}
              onViewLearners={() => onNavigateTab('learners')}
            />
          </Box>

          <Box sx={{ order: 3 }}>
            <ReteachNext
              words={words}
              loading={wordsLoading}
              error={wordsError}
              onViewWords={() => onNavigateTab('words')}
              onOpenMaterials={onBuild}
            />
          </Box>
        </Box>
      </Box>

      <Stack spacing={2.5}>
        <SectionCard title={t('recentActivityHeading')}>
          {feedError && feed.length === 0 ? (
            <DataErrorState error={feedError} dense />
          ) : feedLoading ? (
            <Loading message={t('loadingActivity')} />
          ) : (
            <ActivityFeed items={feed} />
          )}
        </SectionCard>

        <SectionCard title={tc('modeHeading')}>
          {activityError ? (
            <Alert severity="error">{activityError}</Alert>
          ) : activityLoading && !activity ? (
            <Loading message={tc('loading')} />
          ) : (
            <GroupModeBreakdown modes={activity?.modeBreakdown ?? []} />
          )}
        </SectionCard>
      </Stack>
    </Box>
  );
}

'use client';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Loading } from '@/components/Loading';
import type { Assignment } from '@/hooks/useAssignments';
import type { FeedItem } from '@/hooks/useGroup';
import type { GroupActivity } from '@/hooks/useGroupActivity';
import type { LeaderboardEntry } from '@/hooks/useGroupLeaderboard';

import { ActivityFeed } from '../ActivityFeed';
import { AssignmentsList } from '../AssignmentsList';
import { DailyActivityChart, StudyHeatmap } from '../GroupCharts';
import { LeaderboardPanel } from '../LeaderboardPanel';
import { SectionCard } from '../SectionCard';
import { ShowMoreButton } from '../ShowMoreButton';

const ASSIGNMENTS_SHOWN = 5;
const LEADERBOARD_SHOWN = 10;
const FEED_SHOWN = 6;
const HEATMAP_DAYS = 7;

interface OverviewTabProps {
  activity: GroupActivity | null;
  activityLoading: boolean;
  activityError: string | null;
  assignments: Assignment[];
  onEditAssignments: (
    ids: string[],
    updates: { note?: string | null; dueDate?: string | null; availableOn?: string | null },
  ) => Promise<void>;
  onDeleteAssignments: (ids: string[]) => Promise<void>;
  feed: FeedItem[];
  feedLoading: boolean;
  leaderboard: LeaderboardEntry[];
  leaderboardLoading: boolean;
  leaderboardVisible: boolean;
  onLeaderboardVisibilityChange: (visible: boolean) => void;
}

export function OverviewTab({
  activity,
  activityLoading,
  activityError,
  assignments,
  onEditAssignments,
  onDeleteAssignments,
  feed,
  feedLoading,
  leaderboard,
  leaderboardLoading,
  leaderboardVisible,
  onLeaderboardVisibilityChange,
}: OverviewTabProps) {
  const t = useTranslations('Group.groupPage');
  const tc = useTranslations('Group.charts');
  const [allFeed, setAllFeed] = useState(false);

  const visibleFeed = allFeed ? feed : feed.slice(0, FEED_SHOWN);

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 2.5 }}>
      <Box
        sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, flex: { lg: 2 }, minWidth: 0 }}
      >
        <SectionCard title={tc('dailyHeading')}>
          {activityError ? (
            <Alert severity="error">{activityError}</Alert>
          ) : activityLoading && !activity ? (
            <Loading message={tc('loading')} />
          ) : (
            <DailyActivityChart days={activity?.days ?? []} values={activity?.totals.cards ?? []} />
          )}
        </SectionCard>

        <SectionCard title={tc('heatmapHeading')}>
          {activityError ? (
            <Alert severity="error">{activityError}</Alert>
          ) : activityLoading && !activity ? (
            <Loading message={tc('loading')} />
          ) : (
            <StudyHeatmap
              days={(activity?.days ?? []).slice(-HEATMAP_DAYS)}
              members={activity?.members ?? []}
              offset={Math.max(0, (activity?.days.length ?? 0) - HEATMAP_DAYS)}
            />
          )}
        </SectionCard>
      </Box>

      <Box
        sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, flex: { lg: 1 }, minWidth: 0 }}
      >
        <SectionCard title={t('assignmentsHeading')}>
          <AssignmentsList
            assignments={assignments}
            onEditBatch={onEditAssignments}
            onDeleteBatch={onDeleteAssignments}
            maxVisible={ASSIGNMENTS_SHOWN}
          />
        </SectionCard>

        <SectionCard title={t('recentActivityHeading')}>
          {feedLoading ? (
            <Loading message={t('loadingActivity')} />
          ) : (
            <>
              <ActivityFeed items={visibleFeed} />
              {feed.length > FEED_SHOWN && (
                <ShowMoreButton
                  expanded={allFeed}
                  total={feed.length}
                  onClick={() => setAllFeed((v) => !v)}
                />
              )}
            </>
          )}
        </SectionCard>

        <LeaderboardPanel
          entries={leaderboard}
          loading={leaderboardLoading}
          visible={leaderboardVisible}
          onVisibilityChange={onLeaderboardVisibilityChange}
          maxVisible={LEADERBOARD_SHOWN}
        />
      </Box>
    </Box>
  );
}

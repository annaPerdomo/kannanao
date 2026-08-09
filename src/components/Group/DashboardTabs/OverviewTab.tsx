'use client';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { sumLastDays } from '@/components/Group/activityWeek';
import { Loading } from '@/components/Loading';
import type { Assignment } from '@/hooks/useAssignments';
import type { FeedItem } from '@/hooks/useGroup';
import type { GroupActivity } from '@/hooks/useGroupActivity';
import type { LeaderboardEntry } from '@/hooks/useGroupLeaderboard';

import { ActivityFeed } from '../ActivityFeed';
import { AssignmentsList } from '../AssignmentsList';
import {
  type ActivityRangeDays,
  DailyActivityChart,
  DailyRangeSelect,
  StudyHeatmap,
} from '../GroupCharts';
import { LeaderboardPanel } from '../LeaderboardPanel';
import { SectionCard } from '../SectionCard';
import type { GroupDashboardTab } from './constants';

const SIDEBAR_PREVIEW_SHOWN = 3;

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
  onNavigateTab: (tab: GroupDashboardTab) => void;
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
  onNavigateTab,
}: OverviewTabProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const t = useTranslations('Group.groupPage');
  const tc = useTranslations('Group.charts');
  const [rangeDays, setRangeDays] = useState<ActivityRangeDays>(14);

  const studySecsThisWeek = sumLastDays(activity?.totals.durationSecs ?? []);

  // At xs the column wrappers dissolve (`display: contents`) so the `order`
  // values interleave both columns into one stack; at lg the leaderboard
  // backfills the chart column so neither side ends short.
  return (
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

        <SectionCard title={tc('heatmapHeading')}>
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

        <Box sx={{ order: { xs: 5, lg: 0 } }}>
          <LeaderboardPanel
            entries={leaderboard}
            loading={leaderboardLoading}
            visible={leaderboardVisible}
            onVisibilityChange={onLeaderboardVisibilityChange}
            maxVisible={SIDEBAR_PREVIEW_SHOWN}
            compact
          />
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
        <SectionCard title={t('assignmentsHeading')}>
          <AssignmentsList
            assignments={assignments}
            onEditBatch={onEditAssignments}
            onDeleteBatch={onDeleteAssignments}
            maxVisible={SIDEBAR_PREVIEW_SHOWN}
            variant="preview"
            onViewAll={() => onNavigateTab('assignments')}
          />
        </SectionCard>

        <SectionCard title={t('recentActivityHeading')}>
          {feedLoading ? (
            <Loading message={t('loadingActivity')} />
          ) : (
            <>
              <ActivityFeed items={feed.slice(0, SIDEBAR_PREVIEW_SHOWN)} compact />
              {feed.length > SIDEBAR_PREVIEW_SHOWN && (
                <Box sx={{ mt: 1.5, pt: 1.5, borderTop: `1px solid ${alpha(brand[300], 0.3)}` }}>
                  <Button
                    fullWidth
                    size="small"
                    variant="text"
                    onClick={() => onNavigateTab('activity')}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      color: brand[700],
                      borderRadius: theme.radii.sm,
                    }}
                  >
                    {t('viewAllActivity')} →
                  </Button>
                </Box>
              )}
            </>
          )}
        </SectionCard>
      </Box>
    </Box>
  );
}

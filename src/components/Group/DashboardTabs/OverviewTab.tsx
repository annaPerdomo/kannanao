'use client';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { sumLastDays } from '@/components/Group/activityWeek';
import { Loading } from '@/components/Loading';
import type { DifficultWord } from '@/hooks/useDifficultWords';
import type { GroupMember } from '@/hooks/useGroup';
import type { GroupActivity } from '@/hooks/useGroupActivity';

import { DeckReadinessPanel } from '../DeckReadiness';
import {
  type ActivityRangeDays,
  DailyActivityChart,
  DailyRangeSelect,
  StudyHeatmap,
} from '../GroupCharts';
import { PracticeStrength } from '../PracticeStrength';
import { ReteachNext } from '../ReteachNext';
import { SectionCard } from '../SectionCard';
import type { GroupDashboardTab } from './constants';

interface OverviewTabProps {
  groupId: string;
  members: GroupMember[];
  activity: GroupActivity | null;
  activityLoading: boolean;
  activityError: string | null;
  words: DifficultWord[] | undefined;
  wordsLoading: boolean;
  wordsError: string | null;
  onNavigateTab: (tab: GroupDashboardTab) => void;
  onOpenMaterials: () => void;
}

/** Anything that is a whole tab of its own does not get a preview here. */
export function OverviewTab({
  groupId,
  members,
  activity,
  activityLoading,
  activityError,
  words,
  wordsLoading,
  wordsError,
  onNavigateTab,
  onOpenMaterials,
}: OverviewTabProps) {
  const tc = useTranslations('Group.charts');
  const [rangeDays, setRangeDays] = useState<ActivityRangeDays>(14);

  const studySecsThisWeek = sumLastDays(activity?.totals.durationSecs ?? []);

  // At xs the column wrappers dissolve (`display: contents`) so the `order`
  // values, not the JSX order, decide the single-column sequence. Weak practice
  // sits in the wide column only to keep the two sides near-level at lg.
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

        <Box sx={{ order: 3 }}>
          <PracticeStrength activity={activity} loading={activityLoading} error={activityError} />
        </Box>

        <Box sx={{ order: 4 }}>
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
          <DeckReadinessPanel
            groupId={groupId}
            members={members}
            onViewLearners={() => onNavigateTab('learners')}
          />
        </Box>

        <Box sx={{ order: 2 }}>
          <ReteachNext
            words={words}
            loading={wordsLoading}
            error={wordsError}
            onViewWords={() => onNavigateTab('words')}
            onOpenMaterials={onOpenMaterials}
          />
        </Box>
      </Box>
    </Box>
  );
}

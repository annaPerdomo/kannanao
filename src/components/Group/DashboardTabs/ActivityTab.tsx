'use client';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import { useTranslations } from 'next-intl';

import { DataErrorState } from '@/components/DataErrorState';
import { Loading } from '@/components/Loading';
import type { FeedItem } from '@/hooks/useGroup';
import type { GroupActivity } from '@/hooks/useGroupActivity';
import type { DataError } from '@/lib/dataError';

import { ActivityFeed } from '../ActivityFeed';
import { GroupModeBreakdown } from '../GroupCharts';
import { SectionCard } from '../SectionCard';

interface ActivityTabProps {
  feed: FeedItem[];
  feedLoading: boolean;
  feedError?: DataError | null;
  activity: GroupActivity | null;
  activityLoading: boolean;
  activityError: string | null;
}

export function ActivityTab({
  feed,
  feedLoading,
  feedError,
  activity,
  activityLoading,
  activityError,
}: ActivityTabProps) {
  const t = useTranslations('Group.groupPage');
  const tc = useTranslations('Group.charts');

  return (
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
  );
}

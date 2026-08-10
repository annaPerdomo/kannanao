'use client';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import { useTranslations } from 'next-intl';

import { Loading } from '@/components/Loading';
import type { FeedItem } from '@/hooks/useGroup';
import type { GroupActivity } from '@/hooks/useGroupActivity';

import { ActivityFeed } from '../ActivityFeed';
import { GroupModeBreakdown } from '../GroupCharts';
import { SectionCard } from '../SectionCard';

interface ActivityTabProps {
  feed: FeedItem[];
  feedLoading: boolean;
  activity: GroupActivity | null;
  activityLoading: boolean;
  activityError: string | null;
}

export function ActivityTab({
  feed,
  feedLoading,
  activity,
  activityLoading,
  activityError,
}: ActivityTabProps) {
  const t = useTranslations('Group.groupPage');
  const tc = useTranslations('Group.charts');

  return (
    <Stack spacing={2.5}>
      <SectionCard title={t('recentActivityHeading')}>
        {feedLoading ? <Loading message={t('loadingActivity')} /> : <ActivityFeed items={feed} />}
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

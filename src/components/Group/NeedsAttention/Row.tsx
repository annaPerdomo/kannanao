'use client';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import PersonOffOutlinedIcon from '@mui/icons-material/PersonOffOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import TranslateOutlinedIcon from '@mui/icons-material/TranslateOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { dueBucket } from '../dueDate';
import { timeAgo } from '../MemberCard';
import { hasReviewBacklog } from '../reviewBacklog';
import type { AttentionItem, AttentionSeverity } from './types';

interface RowActionsProps {
  item: AttentionItem;
  onSelectMember: (memberId: string) => void;
  onSendNudge: (memberId: string, name: string) => void;
  onViewAssignments: () => void;
  onViewLearners: () => void;
  onViewWords: () => void;
}

function RowActions({
  item,
  onSelectMember,
  onSendNudge,
  onViewAssignments,
  onViewLearners,
  onViewWords,
}: RowActionsProps) {
  const t = useTranslations('Group.needsAttention');

  if (item.kind === 'inactiveLearner') {
    return (
      <>
        <Button
          size="small"
          variant="outlined"
          onClick={() => onSelectMember(item.memberId)}
          sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.78rem', borderRadius: 2 }}
        >
          {t('viewLearnerAction', { name: item.name })}
        </Button>
        <Button
          size="small"
          variant="contained"
          onClick={() => onSendNudge(item.memberId, item.name)}
          sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.78rem', borderRadius: 2 }}
        >
          {t('sendNudgeAction')}
        </Button>
      </>
    );
  }

  if (item.kind === 'reviewBacklog') {
    return (
      <Button
        size="small"
        variant="outlined"
        onClick={() => onSelectMember(item.memberId)}
        sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.78rem', borderRadius: 2 }}
      >
        {t('viewLearnerAction', { name: item.name })}
      </Button>
    );
  }

  if (item.kind === 'wordsForgotten') {
    return (
      <Button
        size="small"
        variant="outlined"
        onClick={onViewWords}
        sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.78rem', borderRadius: 2 }}
      >
        {t('reviewWordsAction')}
      </Button>
    );
  }

  if (item.kind === 'inactiveLearnersCollapsed' || item.kind === 'reviewBacklogCollapsed') {
    return (
      <Button
        size="small"
        variant="outlined"
        onClick={onViewLearners}
        sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.78rem', borderRadius: 2 }}
      >
        {t('viewLearnersAction')}
      </Button>
    );
  }

  return (
    <Button
      size="small"
      variant="outlined"
      onClick={onViewAssignments}
      sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.78rem', borderRadius: 2 }}
    >
      {t('viewAssignmentAction')}
    </Button>
  );
}

function useRowText(item: AttentionItem): { headline: string; subline: string } {
  const t = useTranslations('Group.needsAttention');
  const tMemberCard = useTranslations('Group.memberCard');

  if (item.kind === 'inactiveLearner') {
    // Same predicate as the standalone row this suffix stands in for, so the
    // panel never names a backlog it wouldn't have flagged on its own.
    const backlog = hasReviewBacklog(item)
      ? ` · ${t('reviewBacklogSuffix', { count: item.reviewsWaiting ?? 0 })}`
      : '';
    if (item.days === null) {
      return {
        headline: t('neverStudiedHeadline', { name: item.name }),
        subline: t('neverStudiedSubline') + backlog,
      };
    }
    return {
      headline: t('inactiveLearnerHeadline', { name: item.name, days: item.days }),
      subline:
        t('inactiveLearnerSubline', { relative: timeAgo(item.lastActive, tMemberCard) }) + backlog,
    };
  }

  if (item.kind === 'reviewBacklog') {
    return {
      headline: t('reviewBacklogHeadline', { name: item.name, count: item.reviewsWaiting }),
      subline:
        item.reviewsOverdue3d > 0
          ? t('reviewBacklogSubline', { count: item.reviewsOverdue3d })
          : '',
    };
  }

  if (item.kind === 'inactiveLearnersCollapsed') {
    return {
      headline: t('inactiveLearnersCollapsedHeadline', { count: item.count }),
      subline: '',
    };
  }

  if (item.kind === 'reviewBacklogCollapsed') {
    return {
      headline: t('reviewBacklogCollapsedHeadline', { count: item.count }),
      subline: '',
    };
  }

  if (item.kind === 'wordsForgotten') {
    return {
      headline: t('wordsForgottenHeadline', { count: item.count }),
      subline: t('wordsForgottenSubline', {
        words: item.preview.join(t('wordSeparator')),
        count: item.learnersAffected,
      }),
    };
  }

  const deck = item.deckName;
  let headline: string;
  switch (dueBucket(item.daysUntilDue)) {
    case 'overdue':
      headline = t('assignmentOverdueHeadline', { deck, days: Math.abs(item.daysUntilDue) });
      break;
    case 'today':
      headline = t('assignmentDueTodayHeadline', { deck });
      break;
    case 'tomorrow':
      headline = t('assignmentDueTomorrowHeadline', { deck });
      break;
    default:
      headline = t('assignmentDueInDaysHeadline', { deck, days: item.daysUntilDue });
  }

  let subline = t('assignmentDoneSubline', { done: item.done, total: item.total });
  if (item.close) {
    const { name, progress, goal } = item.close;
    subline += ` · ${t('assignmentCloseSuffix', { name, progress, goal })}`;
  }

  return { headline, subline };
}

const ROW_ICONS: Record<AttentionItem['kind'], typeof PersonOffOutlinedIcon> = {
  inactiveLearner: PersonOffOutlinedIcon,
  inactiveLearnersCollapsed: PersonOffOutlinedIcon,
  assignmentDue: EventBusyOutlinedIcon,
  reviewBacklog: ScheduleOutlinedIcon,
  reviewBacklogCollapsed: ScheduleOutlinedIcon,
  wordsForgotten: TranslateOutlinedIcon,
};

const SEVERITY_TOKEN: Record<AttentionSeverity, 'error' | 'warning' | 'info'> = {
  error: 'error',
  warning: 'warning',
  info: 'info',
};

interface NeedsAttentionRowProps {
  item: AttentionItem;
  onSelectMember: (memberId: string) => void;
  onSendNudge: (memberId: string, name: string) => void;
  onViewAssignments: () => void;
  onViewLearners: () => void;
  onViewWords: () => void;
}

export function NeedsAttentionRow({
  item,
  onSelectMember,
  onSendNudge,
  onViewAssignments,
  onViewLearners,
  onViewWords,
}: NeedsAttentionRowProps) {
  const theme = useTheme();
  const { headline, subline } = useRowText(item);
  const Icon = ROW_ICONS[item.kind];
  const severityColor = theme.palette[SEVERITY_TOKEN[item.severity]].main;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' },
        gap: 1.5,
        py: 1.25,
      }}
    >
      <Box
        sx={{
          width: 38,
          height: 38,
          flexShrink: 0,
          borderRadius: theme.radii.sm,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: alpha(severityColor, 0.15),
        }}
      >
        <Icon aria-hidden sx={{ fontSize: 19, color: severityColor }} />
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: 'text.primary' }}>
          {headline}
        </Typography>
        {subline && (
          <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mt: 0.25 }}>
            {subline}
          </Typography>
        )}
      </Box>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ flexShrink: 0, width: { xs: '100%', sm: 'auto' } }}
      >
        <RowActions
          item={item}
          onSelectMember={onSelectMember}
          onSendNudge={onSendNudge}
          onViewAssignments={onViewAssignments}
          onViewLearners={onViewLearners}
          onViewWords={onViewWords}
        />
      </Stack>
    </Box>
  );
}

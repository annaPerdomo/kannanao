'use client';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import PersonOffOutlinedIcon from '@mui/icons-material/PersonOffOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { dueBucket } from '../dueDate';
import { timeAgo } from '../MemberCard';
import type { AttentionItem, AttentionSeverity } from './types';

interface RowActionsProps {
  item: AttentionItem;
  onSelectMember: (memberId: string) => void;
  onSendNudge: (memberId: string, name: string) => void;
  onViewAssignments: () => void;
  onViewLearners: () => void;
}

function RowActions({
  item,
  onSelectMember,
  onSendNudge,
  onViewAssignments,
  onViewLearners,
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

  if (item.kind === 'inactiveLearnersCollapsed') {
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
    if (item.days === null) {
      return {
        headline: t('neverStudiedHeadline', { name: item.name }),
        subline: t('neverStudiedSubline'),
      };
    }
    return {
      headline: t('inactiveLearnerHeadline', { name: item.name, days: item.days }),
      subline: t('inactiveLearnerSubline', { relative: timeAgo(item.lastActive, tMemberCard) }),
    };
  }

  if (item.kind === 'inactiveLearnersCollapsed') {
    return {
      headline: t('inactiveLearnersCollapsedHeadline', { count: item.count }),
      subline: '',
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
}

export function NeedsAttentionRow({
  item,
  onSelectMember,
  onSendNudge,
  onViewAssignments,
  onViewLearners,
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
        />
      </Stack>
    </Box>
  );
}

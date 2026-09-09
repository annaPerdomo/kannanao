'use client';
import RouteOutlinedIcon from '@mui/icons-material/RouteOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import { Loading } from '@/components/Loading';
import type { Assignment } from '@/hooks/useAssignments';
import type { Deck } from '@/types/deck';

import { daysUntilDue, dueBucket, dueDateLabel, todayIso } from '../dueDate';
import { SectionCard } from '../SectionCard';
import { timeAgo } from '../timeAgo';
import { deriveMaterialsProgress } from './deriveMaterialsProgress';
import { NotHandedOutList } from './NotHandedOutList';

export { deriveMaterialsProgress } from './deriveMaterialsProgress';

interface MaterialsProgressProps {
  assignments: Assignment[];
  loading: boolean;
  error: string | null;
  ownDecks: Deck[];
  canAssign: boolean;
  onViewAssignments: () => void;
  onAssignDeck: (deckId: string) => void;
  onOpenMaterials: () => void;
}

function CountBlock({ value, label }: { value: number; label: string }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
      <Typography
        sx={{
          fontSize: '1.35rem',
          fontWeight: 800,
          color: 'text.primary',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
        }}
      >
        {value}
      </Typography>
      <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>{label}</Typography>
    </Box>
  );
}

export function MaterialsProgress({
  assignments,
  loading,
  error,
  ownDecks,
  canAssign,
  onViewAssignments,
  onAssignDeck,
  onOpenMaterials,
}: MaterialsProgressProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const t = useTranslations('Group.materialsProgress');
  const ta = useTranslations('Group.assignmentsList');
  const tt = useTranslations('Group.timeAgo');

  const progress = useMemo(
    () => deriveMaterialsProgress({ assignments, ownDecks, today: todayIso() }),
    [assignments, ownDecks],
  );

  const isEmpty = assignments.length === 0 && ownDecks.length === 0;
  const showLoading = loading && assignments.length === 0;
  const showError = !!error && assignments.length === 0;

  const nextDueBucket = progress.nextDue?.dueDate
    ? dueBucket(daysUntilDue(progress.nextDue.dueDate))
    : null;
  const nextDueColor =
    nextDueBucket === 'overdue'
      ? 'error.main'
      : nextDueBucket === 'today'
        ? 'warning.main'
        : 'text.secondary';

  return (
    <SectionCard
      icon={<RouteOutlinedIcon aria-hidden sx={{ fontSize: '1.15rem', color: brand[600] }} />}
      title={t('heading')}
      footer={
        <Stack spacing={1}>
          <Button
            fullWidth
            size="small"
            variant="text"
            onClick={onViewAssignments}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.8rem',
              color: brand[700],
              borderRadius: theme.radii.sm,
            }}
          >
            {t('seeAllAssignments')}
          </Button>
          <Button
            fullWidth
            size="small"
            variant="contained"
            onClick={onOpenMaterials}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: theme.radii.sm }}
          >
            {t('makeMaterials')}
          </Button>
        </Stack>
      }
    >
      {showLoading ? (
        <Loading message={t('loading')} />
      ) : showError ? (
        <Alert severity="error">{error}</Alert>
      ) : isEmpty ? (
        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
          {t('emptyHint')}
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ display: 'flex', gap: 2.5 }}>
            <CountBlock value={progress.finishedCount} label={t('finished')} />
            <CountBlock value={progress.currentCount} label={t('inProgress')} />
            <CountBlock value={progress.upcomingCount} label={t('comingUp')} />
          </Box>

          {progress.nextDue && (
            <Typography sx={{ fontSize: '0.82rem', color: nextDueColor }}>
              🎯 {t('nextDue', { deck: progress.nextDue.deckName ?? ta('unknownDeck') })} ·{' '}
              {dueDateLabel(progress.nextDue.dueDate, ta)}
            </Typography>
          )}

          {progress.recentlyFinished.length > 0 && (
            <Box>
              <Typography
                sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', mb: 0.5 }}
              >
                {t('recentlyFinished')}
              </Typography>
              <Stack spacing={0.4}>
                {progress.recentlyFinished.map((batch) => (
                  <Typography key={batch.key} sx={{ fontSize: '0.82rem', color: 'text.primary' }}>
                    ✅ {batch.deckName ?? ta('unknownDeck')} · {timeAgo(batch.finishedAt, tt)}
                  </Typography>
                ))}
              </Stack>
            </Box>
          )}

          {progress.notHandedOut.length > 0 && (
            <NotHandedOutList
              decks={progress.notHandedOut}
              canAssign={canAssign}
              onAssignDeck={onAssignDeck}
            />
          )}
        </Box>
      )}
    </SectionCard>
  );
}

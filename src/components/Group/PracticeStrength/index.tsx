'use client';
import HeadphonesOutlinedIcon from '@mui/icons-material/HeadphonesOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { Loading } from '@/components/Loading';
import { modeLabel } from '@/components/Stats/constants';
import type { GroupActivity } from '@/hooks/useGroupActivity';
import type { SessionMode } from '@/hooks/useProgress';

import { SectionCard } from '../SectionCard';
import { ShowMoreButton } from '../ShowMoreButton';
import { type PracticeModeStrength, rankPracticeModes } from './ranking';

/** The app has sixteen practice modes; a group can be using all of them. */
const COLLAPSED_ROWS = 5;

interface PracticeStrengthProps {
  activity: GroupActivity | null;
  loading: boolean;
  error: string | null;
}

function ModeRow({ entry }: { entry: PracticeModeStrength }) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const t = useTranslations('Group.practiceStrength');
  const tc = useTranslations('Group.charts');

  const label = modeLabel(entry.mode as SessionMode);
  const cards = tc('modeCardsCount', { count: entry.cardsStudied });

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
        <Typography
          sx={{ flex: 1, minWidth: 0, fontSize: '0.85rem', fontWeight: 700, color: 'text.primary' }}
          noWrap
        >
          {label}
        </Typography>
        <Typography sx={{ flexShrink: 0, fontSize: '0.75rem', color: 'text.secondary' }}>
          {cards}
        </Typography>
        {entry.enoughData && (
          <Typography
            sx={{
              flexShrink: 0,
              fontSize: '0.8rem',
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              color: 'text.primary',
              minWidth: 44,
              textAlign: 'right',
            }}
          >
            {t('accuracy', { pct: entry.accuracy })}
          </Typography>
        )}
      </Box>

      {entry.enoughData ? (
        <Box
          aria-hidden
          sx={{
            mt: 0.5,
            height: 8,
            borderRadius: 99,
            bgcolor: alpha(brand[300], 0.35),
            overflow: 'hidden',
          }}
        >
          <Box sx={{ width: `${entry.accuracy}%`, height: '100%', bgcolor: brand[600] }} />
        </Box>
      ) : (
        <Typography sx={{ mt: 0.35, fontSize: '0.76rem', color: 'text.secondary' }}>
          {t('lowSample')}
        </Typography>
      )}
    </Box>
  );
}

export function PracticeStrength({ activity, loading, error }: PracticeStrengthProps) {
  const theme = useTheme();
  const t = useTranslations('Group.practiceStrength');
  const tc = useTranslations('Group.charts');
  const [expanded, setExpanded] = useState(false);

  const modes = useMemo(
    () => rankPracticeModes(activity?.modeBreakdown ?? []),
    [activity?.modeBreakdown],
  );
  const visible = expanded ? modes : modes.slice(0, COLLAPSED_ROWS);

  return (
    <SectionCard
      icon={
        <HeadphonesOutlinedIcon
          aria-hidden
          sx={{ fontSize: '1.15rem', color: theme.palette.brand[600] }}
        />
      }
      title={t('heading')}
    >
      {error ? (
        <Alert severity="error">{error}</Alert>
      ) : loading && !activity ? (
        <Loading message={tc('loading')} />
      ) : modes.length === 0 ? (
        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
          {tc('modeEmpty')}
        </Typography>
      ) : (
        <Box>
          <Stack spacing={1.25}>
            {visible.map((entry) => (
              <ModeRow key={entry.mode} entry={entry} />
            ))}
          </Stack>
          {modes.length > COLLAPSED_ROWS && (
            <ShowMoreButton
              expanded={expanded}
              total={modes.length}
              onClick={() => setExpanded((v) => !v)}
            />
          )}
        </Box>
      )}
    </SectionCard>
  );
}

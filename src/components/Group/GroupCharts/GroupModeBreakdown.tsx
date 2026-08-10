'use client';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { modeColor, modeLabel } from '@/components/Stats/constants';
import type { GroupActivityModeStat } from '@/hooks/useGroupActivity';
import type { SessionMode } from '@/hooks/useProgress';

import { ShowMoreButton } from '../ShowMoreButton';
import { type ModeVolume, rankModeVolume } from './modeVolume';

/** The app has sixteen practice modes; a busy group can be using all of them. */
const COLLAPSED_ROWS = 6;
const BAR_HEIGHT = 10;
/** Fits "Sentence Builder", the longest mode name, on one line. */
const LABEL_WIDTH = 148;
/** A one-card mode still gets a visible sliver instead of nothing. */
const MIN_BAR = 6;

interface GroupModeBreakdownProps {
  modes: GroupActivityModeStat[];
}

function ModeBar({ entry }: { entry: ModeVolume }) {
  const theme = useTheme();
  const locale = useLocale();
  const t = useTranslations('Group.charts');

  const label = modeLabel(entry.mode as SessionMode);
  const color = modeColor(entry.mode as SessionMode);
  const tooltip = entry.enoughData
    ? t('modeTooltipWithAccuracy', {
        label,
        count: entry.cardsStudied,
        sessions: entry.sessions,
        pct: entry.accuracy,
      })
    : t('modeTooltip', { label, count: entry.cardsStudied, sessions: entry.sessions });

  return (
    <Tooltip title={tooltip}>
      {/* A graphic, not a control: only a named role carries the sessions and
          accuracy that live in the tooltip, and it costs no tab stop to do it. */}
      <Box
        role="img"
        aria-label={tooltip}
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          columnGap: 1.5,
          borderRadius: theme.radii.sm,
        }}
      >
        <Typography
          sx={{
            flex: { xs: 1, sm: '0 0 auto' },
            width: { sm: LABEL_WIDTH },
            minWidth: 0,
            fontSize: '0.85rem',
            fontWeight: 700,
            color: 'text.primary',
          }}
          noWrap
        >
          {label}
        </Typography>

        <Box
          aria-hidden
          sx={{
            order: { xs: 3, sm: 2 },
            flex: { xs: '1 0 100%', sm: '1 1 auto' },
            mt: { xs: 0.5, sm: 0 },
            height: BAR_HEIGHT,
            borderRadius: 99,
            bgcolor: alpha(theme.palette.text.primary, 0.07),
          }}
        >
          <Box
            sx={{
              width: `${entry.barPct}%`,
              minWidth: MIN_BAR,
              height: '100%',
              borderRadius: 99,
              bgcolor: color,
            }}
          />
        </Box>

        <Box
          sx={{
            order: { xs: 2, sm: 3 },
            display: 'flex',
            alignItems: 'baseline',
            gap: 1,
            flexShrink: 0,
          }}
        >
          <Typography
            sx={{
              minWidth: 34,
              textAlign: 'right',
              fontSize: '0.8rem',
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              color: 'text.primary',
            }}
          >
            {entry.cardsStudied.toLocaleString(locale)}
          </Typography>
          <Typography
            sx={{
              minWidth: 62,
              textAlign: 'right',
              fontSize: '0.72rem',
              fontVariantNumeric: 'tabular-nums',
              color: 'text.secondary',
            }}
          >
            {t('modeShare', { pct: entry.share })}
          </Typography>
        </Box>
      </Box>
    </Tooltip>
  );
}

/**
 * Where the window's practice actually went: cards studied per mode as ranked
 * horizontal bars. Horizontal because the mode names are long words, and ranked
 * because the question is "what are they using", not "how did each mode trend".
 *
 * Bars carry each mode's app-wide identity color, the same one its sessions wear
 * everywhere else; the numbers stay in text tokens so nothing is read off a hue.
 */
export function GroupModeBreakdown({ modes }: GroupModeBreakdownProps) {
  const t = useTranslations('Group.charts');
  const [expanded, setExpanded] = useState(false);

  const ranked = useMemo(() => rankModeVolume(modes), [modes]);

  if (ranked.length === 0) {
    return (
      <Box sx={{ py: 5, textAlign: 'center' }}>
        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
          {t('modeEmpty')}
        </Typography>
      </Box>
    );
  }

  const visible = expanded ? ranked : ranked.slice(0, COLLAPSED_ROWS);

  return (
    <Box>
      <Stack spacing={1.5}>
        {visible.map((entry) => (
          <ModeBar key={entry.mode} entry={entry} />
        ))}
      </Stack>
      {ranked.length > COLLAPSED_ROWS && (
        <ShowMoreButton
          expanded={expanded}
          total={ranked.length}
          onClick={() => setExpanded((v) => !v)}
        />
      )}
    </Box>
  );
}

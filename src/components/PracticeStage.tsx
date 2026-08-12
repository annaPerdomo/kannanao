'use client';
import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';

import { NAVBAR_HEIGHT } from '@/components/NavBar';
import { BOTTOM_NAV_HEIGHT } from '@/components/NavBar/BottomNav';
import { LAYOUT } from '@/theme';

/**
 * Height the app chrome takes off the viewport, per breakpoint: the top bar
 * everywhere, plus the phone bottom bar (`main` pads for it below `sm`).
 */
const CHROME = {
  xs: `${NAVBAR_HEIGHT.xs + BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom)`,
  sm: `${NAVBAR_HEIGHT.sm}px`,
  md: `${NAVBAR_HEIGHT.md}px`,
} as const;

/**
 * Squeezing a stage below this stops helping — the board is unreadable long
 * before it fits. Shorter windows than this scroll, as they did before.
 */
const MIN_STAGE_PX = 460;

/**
 * A floor, never a ceiling. As a fixed `height` the stage charged the shortfall
 * to whichever child was flexible, collapsing it to nothing and painting its
 * contents over the rows around it instead of scrolling.
 */
const stageMinHeightSx = {
  minHeight: {
    xs: `max(${MIN_STAGE_PX}px, calc(100dvh - (${CHROME.xs})))`,
    sm: `max(${MIN_STAGE_PX}px, calc(100dvh - (${CHROME.sm})))`,
    md: `max(${MIN_STAGE_PX}px, calc(100dvh - (${CHROME.md})))`,
  },
} as const;

/** Every pixel here comes off the board, so short viewports spend less of it. */
const STAGE_PY = { xs: 1.5, sm: 2, md: 3 } as const;

export interface PracticeStageProps {
  children: React.ReactNode;
  sx?: SxProps<Theme>;
}

/**
 * The frame every focused practice surface sits in: at least as tall as the
 * viewport has left, and a flex column so the board takes the slack while the
 * header and the buttons under it keep their size — a sideways tablet (~700px
 * of usable height) shows the whole exercise without scrolling to the answers.
 *
 * Children that absorb the leftover height set `flex: 1`, and must NOT set
 * `minHeight: 0` — that is what lets a child collapse under its own content.
 */
export function PracticeStage({ children, sx }: PracticeStageProps) {
  return (
    <Box
      sx={[
        {
          ...stageMinHeightSx,
          maxWidth: LAYOUT.narrowMaxWidth,
          mx: 'auto',
          px: LAYOUT.pagePx,
          py: STAGE_PY,
          display: 'flex',
          flexDirection: 'column',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  );
}

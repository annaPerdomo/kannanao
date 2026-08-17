'use client';

import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import { alpha } from '@mui/material/styles';

import { cardShellSx, FACE_SIZE, LINE_HEIGHTS, SKELETON_WIDTH } from './styles';

const shimmer = { bgcolor: alpha('#fff', 0.22) } as const;

/**
 * Mirrors DueState's box model piece for piece rather than guessing a height —
 * same face, same three text rows, same wrapping button row. The hero clips
 * whatever it can't fit, so a placeholder taller than the card is not a jump,
 * it is a cut-off.
 */
export function AdventureSkeleton() {
  return (
    <Box sx={{ ...cardShellSx, width: SKELETON_WIDTH }} aria-hidden>
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Skeleton variant="circular" width={FACE_SIZE} height={FACE_SIZE} sx={shimmer} />
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            {/* Two eyebrow lines: the milestone tease is a sentence, and it is
                what the card shows most days. */}
            <Skeleton variant="text" width="100%" height={LINE_HEIGHTS.eyebrow} sx={shimmer} />
            <Skeleton variant="text" width="70%" height={LINE_HEIGHTS.eyebrow} sx={shimmer} />
            <Skeleton variant="text" width="60%" height={LINE_HEIGHTS.title} sx={shimmer} />
            <Skeleton variant="text" width="45%" height={LINE_HEIGHTS.body} sx={shimmer} />
          </Box>
          <Skeleton
            variant="rounded"
            width={84}
            height={LINE_HEIGHTS.button}
            sx={{ ...shimmer, flexShrink: 0 }}
          />
        </Box>
        <Skeleton variant="text" width={110} height={LINE_HEIGHTS.link} sx={shimmer} />
      </Box>
      <Skeleton variant="rounded" width={148} height={LINE_HEIGHTS.weekDots} sx={shimmer} />
    </Box>
  );
}

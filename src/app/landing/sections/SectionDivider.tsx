'use client';

import Box from '@mui/material/Box';

/**
 * Gradient divider between landing page sections.
 */
export function SectionDivider({ fromColor, toColor }: { fromColor: string; toColor: string }) {
  return (
    <Box
      sx={{
        height: { xs: 40, md: 56 },
        background: `linear-gradient(180deg, ${fromColor} 0%, ${toColor} 100%)`,
      }}
    />
  );
}

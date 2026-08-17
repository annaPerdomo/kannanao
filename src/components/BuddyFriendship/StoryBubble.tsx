'use client';

import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { useReducedMotion } from '@/hooks/useReducedMotion';

import { lineFadeIn, stageFade } from './animations';

interface StoryBubbleProps {
  text: string;
  animate?: boolean;
}

export function StoryBubble({ text, animate = true }: StoryBubbleProps) {
  const { brand } = useTheme().palette;
  const reduced = useReducedMotion();

  return (
    <Box
      sx={{
        alignSelf: 'flex-start',
        maxWidth: '100%',
        px: 1.75,
        py: 1,
        borderRadius: 3,
        bgcolor: alpha('#fff', 0.9),
        border: `1.5px solid ${alpha(brand[300], 0.45)}`,
        boxShadow: `0 3px 12px ${alpha(brand[400], 0.14)}`,
        animation: animate ? `${reduced ? stageFade : lineFadeIn} 0.35s ease-out` : 'none',
      }}
    >
      <Typography sx={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'text.primary' }}>
        {text}
      </Typography>
    </Box>
  );
}

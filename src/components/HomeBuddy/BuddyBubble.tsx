'use client';

import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { bubbleIn } from './animations';

interface BuddyBubbleProps {
  text: string;
  reaction: 'idle' | 'correct' | 'wrong';
  accent: string;
}

export function BuddyBubble({ text, reaction, accent }: BuddyBubbleProps) {
  const theme = useTheme();
  const { brand } = theme.palette;

  const bubbleColor =
    reaction === 'correct'
      ? alpha('#059669', 0.08)
      : reaction === 'wrong'
        ? alpha('#DC2626', 0.06)
        : alpha('#fff', 0.95);

  const bubbleBorder =
    reaction === 'correct'
      ? alpha('#059669', 0.3)
      : reaction === 'wrong'
        ? alpha('#DC2626', 0.25)
        : alpha(accent, 0.4);

  const textColor =
    reaction === 'correct' ? '#059669' : reaction === 'wrong' ? '#DC2626' : brand[700];

  return (
    <Box
      key={text}
      sx={{
        position: 'relative',
        bgcolor: bubbleColor,
        backdropFilter: 'blur(8px)',
        border: `1.5px solid ${bubbleBorder}`,
        borderRadius: 2.5,
        px: 1.5,
        py: 0.75,
        maxWidth: 160,
        boxShadow: `0 4px 16px ${alpha(brand[400], 0.12)}`,
        animation: `${bubbleIn} 0.35s ease-out`,
        pointerEvents: 'none',
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: -6,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: `6px solid ${bubbleColor}`,
        },
      }}
    >
      <Typography
        sx={{
          fontSize: '0.72rem',
          fontWeight: 700,
          color: textColor,
          textAlign: 'center',
          lineHeight: 1.3,
        }}
      >
        {text}
      </Typography>
    </Box>
  );
}

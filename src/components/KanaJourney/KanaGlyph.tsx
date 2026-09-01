'use client';
import { Box, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

interface KanaGlyphProps {
  kana: string;
  onPlay?: () => void;
  playLabel?: string;
  sx?: SxProps<Theme>;
}

export function KanaGlyph({ kana, onPlay, playLabel, sx }: KanaGlyphProps) {
  const interactive = !!onPlay;
  return (
    <Box
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? playLabel : undefined}
      onClick={onPlay}
      onKeyDown={
        interactive
          ? (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onPlay();
              }
            }
          : undefined
      }
      sx={[
        {
          width: { xs: 128, sm: 160 },
          height: { xs: 128, sm: 160 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 4,
          cursor: interactive ? 'pointer' : 'default',
          userSelect: 'none',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Typography
        component="span"
        sx={{ fontSize: { xs: '4rem', sm: '5rem' }, lineHeight: 1, color: 'text.primary' }}
      >
        {kana}
      </Typography>
    </Box>
  );
}

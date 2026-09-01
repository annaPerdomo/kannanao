'use client';
import LockIcon from '@mui/icons-material/Lock';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { Box, Chip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';

import type { KanaIsland, KanaStars } from '@/lib/kanaProficiency';

const MAX_STARS = 3;

export function StarRow({ stars, size = 18 }: { stars: KanaStars; size?: number }) {
  const theme = useTheme();
  return (
    <Box aria-hidden sx={{ display: 'flex', justifyContent: 'center', gap: 0.25 }}>
      {Array.from({ length: MAX_STARS }, (_, i) =>
        i < stars ? (
          <StarIcon key={i} sx={{ fontSize: size, color: theme.palette.warning.main }} />
        ) : (
          <StarBorderIcon
            key={i}
            sx={{ fontSize: size, color: alpha(theme.palette.text.secondary, 0.45) }}
          />
        ),
      )}
    </Box>
  );
}

interface IslandButtonProps {
  island: KanaIsland;
  onPlay: (setId: string) => void;
}

export function IslandButton({ island, onPlay }: IslandButtonProps) {
  const t = useTranslations('KanaJourney.journey');
  const theme = useTheme();
  const { brand } = theme.palette;
  const { set, stars, status, dueCount } = island;
  const locked = status === 'locked';
  const kana = set.entries.map((e) => e.kana).join(' · ');

  const label = locked
    ? t('lockedIslandLabel', { kana })
    : t('islandLabel', { kana, stars, max: MAX_STARS });

  const handlePlay = () => {
    if (!locked) onPlay(set.id);
  };

  return (
    <Box
      role="button"
      tabIndex={locked ? -1 : 0}
      aria-label={label}
      aria-disabled={locked}
      onClick={handlePlay}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handlePlay();
        }
      }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        px: 2,
        py: 1.75,
        borderRadius: '20px',
        cursor: locked ? 'default' : 'pointer',
        opacity: locked ? 0.55 : 1,
        bgcolor: 'background.paper',
        border: `${status === 'next' ? 2 : 1}px solid ${alpha(
          status === 'next' ? brand[500] : brand[300],
          status === 'next' ? 0.9 : 0.25,
        )}`,
        boxShadow:
          status === 'next'
            ? `0 8px 22px ${alpha(brand[400], 0.28)}`
            : `0 1px 3px ${alpha(brand[400], 0.08)}`,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': locked ? undefined : { transform: 'translateY(-2px)' },
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 56,
          height: 56,
          flexShrink: 0,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: (th) => th.fonts.jp,
          fontSize: '1.7rem',
          fontWeight: 700,
          color: status === 'mastered' ? '#fff' : 'text.primary',
          background:
            status === 'mastered'
              ? `linear-gradient(135deg, ${brand[500]}, ${theme.palette.accent[500]})`
              : alpha(brand[300], 0.16),
        }}
      >
        {locked ? <LockIcon fontSize="small" /> : set.label}
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          aria-hidden
          sx={{
            fontFamily: (th) => th.fonts.jp,
            fontWeight: 700,
            fontSize: '1.05rem',
            color: 'text.primary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {kana}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
          <StarRow stars={stars} />
          {status === 'next' && <Chip size="small" color="primary" label={t('startHere')} />}
          {status === 'mastered' && dueCount > 0 && (
            <Chip size="small" variant="outlined" label={t('timeToReview')} />
          )}
        </Box>
      </Box>
    </Box>
  );
}

'use client';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { memo } from 'react';

import TitleFurigana from '@/components/TitleFurigana';
import type { BinderCard as BinderEntry } from '@/lib/binder';
import { cardXp } from '@/lib/flashcardUtils';
import { furiganaFromReading } from '@/lib/furigana';

import { CollectibleCardFrame } from './CollectibleCardFrame';

interface BinderCardProps {
  entry: BinderEntry;
  onOpen: (entry: BinderEntry) => void;
}

export const BinderCard = memo(function BinderCard({ entry, onOpen }: BinderCardProps) {
  const t = useTranslations('Binder.card');
  const { brand, accent } = useTheme().palette;
  const { card, strength } = entry;
  const collected = strength !== 'new';
  const strong = strength === 'strong';
  const frame = `linear-gradient(145deg, ${brand[100]} 0%, ${brand[300]} 25%, ${brand[50]} 50%, ${brand[400]} 75%, ${brand[100]} 100%)`;
  const goldFrame = `linear-gradient(145deg, #FDE68A 0%, #F59E0B 25%, #FFF7CC 50%, #D97706 75%, #FDE68A 100%)`;
  const label = collected
    ? t('openAria', { word: card.word })
    : t('lockedAria', { word: card.word });
  const markup = furiganaFromReading(card.word, card.reading) ?? card.word;

  return (
    <CollectibleCardFrame
      label={label}
      onOpen={() => onOpen(entry)}
      frame={strong ? goldFrame : frame}
      glow={brand[400]}
      unlocked={collected}
      sheen={strong}
      lockedIcon="❔"
      lockedContent={
        <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.05em' }}>
          {t('locked')}
        </Typography>
      }
    >
      <Box
        sx={{
          px: 1,
          py: 0.4,
          background: `linear-gradient(135deg, ${brand[400]} 0%, ${accent[400]} 100%)`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography
          sx={{ fontSize: '0.55rem', fontWeight: 900, color: '#fff', letterSpacing: '0.07em' }}
        >
          {card.jlptLevel ?? t('kind')}
        </Typography>
        <Typography sx={{ fontSize: '0.6rem', fontWeight: 900, color: '#fff' }}>
          {cardXp(card.jlptLevel)} XP
        </Typography>
      </Box>
      {card.imageUrl ? (
        <Box
          component="img"
          src={card.imageUrl}
          alt=""
          loading="lazy"
          draggable={false}
          sx={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', flexShrink: 0 }}
        />
      ) : (
        <Box
          aria-hidden
          sx={{
            width: '100%',
            aspectRatio: '4 / 3',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: { xs: '2.4rem', sm: '3rem' },
            fontWeight: 900,
            color: alpha(brand[500], 0.35),
            background: `radial-gradient(circle at 50% 40%, ${alpha(accent[100], 0.9)} 0%, ${alpha(brand[100], 0.9)} 100%)`,
          }}
        >
          {card.cardType === 'phrase' ? '💬' : Array.from(card.word)[0]}
        </Box>
      )}
      <Box
        sx={{
          flexGrow: 1,
          px: 0.75,
          py: 0.5,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          textAlign: 'center',
          minWidth: 0,
        }}
      >
        <Typography
          component="div"
          sx={{
            fontWeight: 800,
            fontSize: { xs: '0.95rem', sm: '1.05rem' },
            lineHeight: 1.2,
            color: 'text.primary',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          <TitleFurigana markup={markup} />
        </Typography>
        <Typography noWrap sx={{ fontSize: '0.72rem', color: 'text.secondary', mt: 0.25 }}>
          {card.meaning}
        </Typography>
      </Box>
      {strong && (
        <StarRoundedIcon
          aria-hidden
          sx={{
            position: 'absolute',
            top: 26,
            right: 8,
            fontSize: '1.2rem',
            color: '#FBBF24',
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))',
            zIndex: 3,
          }}
        />
      )}
    </CollectibleCardFrame>
  );
});

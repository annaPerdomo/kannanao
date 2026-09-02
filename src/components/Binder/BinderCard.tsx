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

import { HOLO_SHEEN } from './styles';

interface BinderCardProps {
  entry: BinderEntry;
  onOpen: (entry: BinderEntry) => void;
}

export const BinderCard = memo(function BinderCard({ entry, onOpen }: BinderCardProps) {
  const t = useTranslations('Binder.card');
  const { brand, accent } = useTheme().palette;
  const { card, strength } = entry;
  const collected = strength !== 'new';
  const frame = `linear-gradient(145deg, ${brand[100]} 0%, ${brand[300]} 25%, ${brand[50]} 50%, ${brand[400]} 75%, ${brand[100]} 100%)`;
  const goldFrame = `linear-gradient(145deg, #FDE68A 0%, #F59E0B 25%, #FFF7CC 50%, #D97706 75%, #FDE68A 100%)`;
  const label = collected
    ? t('openAria', { word: card.word })
    : t('lockedAria', { word: card.word });
  const markup = furiganaFromReading(card.word, card.reading) ?? card.word;

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={() => onOpen(entry)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(entry);
        }
      }}
      sx={{
        position: 'relative',
        aspectRatio: '5 / 7',
        borderRadius: '14px',
        p: '4px',
        cursor: 'pointer',
        background: collected
          ? strength === 'strong'
            ? goldFrame
            : frame
          : alpha(brand[200], 0.5),
        boxShadow: collected
          ? `0 4px 14px rgba(0,0,0,0.14), 0 1px 4px ${alpha(brand[400], 0.25)}`
          : 'none',
        transition: 'transform 0.2s cubic-bezier(.34,1.56,.64,1), box-shadow 0.2s ease',
        '&:hover, &:focus-visible': { transform: 'translateY(-4px)', outline: 'none' },
        '&:focus-visible': { boxShadow: `0 0 0 3px ${alpha(accent[500], 0.5)}` },
      }}
    >
      {strength === 'strong' && (
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            borderRadius: '14px',
            background: HOLO_SHEEN,
            opacity: 0.55,
            pointerEvents: 'none',
            mixBlendMode: 'screen',
            zIndex: 2,
          }}
        />
      )}

      {collected ? (
        <Box
          sx={{
            height: '100%',
            borderRadius: '10px',
            bgcolor: brand[50],
            border: '2px solid rgba(255,255,255,0.88)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
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
          {strength === 'strong' && (
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
        </Box>
      ) : (
        <Box
          sx={{
            height: '100%',
            borderRadius: '10px',
            backgroundImage: `radial-gradient(circle at 50% 50%, ${alpha(brand[500], 0.55)} 0%, ${alpha(brand[800], 0.55)} 100%), radial-gradient(circle, ${alpha('#fff', 0.1)} 1.5px, transparent 1.5px)`,
            backgroundSize: 'auto, 14px 14px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.5,
            color: alpha('#fff', 0.9),
          }}
        >
          <Typography sx={{ fontSize: '1.6rem', lineHeight: 1 }} aria-hidden>
            ❔
          </Typography>
          <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.05em' }}>
            {t('locked')}
          </Typography>
        </Box>
      )}
    </Box>
  );
});

'use client';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { memo } from 'react';

import type { MemoryCardEntry } from '@/lib/binderMemories';
import { BUDDY_ART, buddyFaceSrc, buddyMemorySrc } from '@/lib/buddies';

import { CollectibleCardFrame } from './CollectibleCardFrame';

interface MemoryCardProps {
  entry: MemoryCardEntry;
  name: string;
  onOpen: (entry: MemoryCardEntry) => void;
}

export const MemoryCard = memo(function MemoryCard({ entry, name, onOpen }: MemoryCardProps) {
  const t = useTranslations('Binder.memories.card');
  const tFriendship = useTranslations('Home.buddy.friendship');
  const { brand } = useTheme().palette;
  const art = BUDDY_ART[entry.buddyKey];
  const glow = art?.accent ?? brand[400];
  const levelName = tFriendship(`levelNames.${entry.level}`);
  const title = entry.title ?? levelName;
  const frame = `linear-gradient(145deg, ${alpha(glow, 0.5)} 0%, ${glow} 25%, #FFF7CC 50%, ${glow} 75%, ${alpha(glow, 0.5)} 100%)`;
  const scene = buddyMemorySrc(entry.buddyKey, entry.level);
  const label = entry.unlocked
    ? t('openAria', { title })
    : t('lockedAria', { title, count: entry.heartsAway, name });

  return (
    <CollectibleCardFrame
      label={label}
      onOpen={() => onOpen(entry)}
      frame={frame}
      glow={glow}
      unlocked={entry.unlocked}
      sheen
      faceBg={art?.bg}
      lockedIcon="🔒"
      lockedContent={
        <>
          <Typography
            sx={{
              fontSize: '0.7rem',
              fontWeight: 800,
              lineHeight: 1.2,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {entry.title ?? t('lockedTitle')}
          </Typography>
          <Typography sx={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.03em' }}>
            {t('more', { count: entry.heartsAway })}
          </Typography>
        </>
      }
    >
      <Box
        sx={{
          px: 1,
          py: 0.4,
          background: `linear-gradient(135deg, ${glow} 0%, ${alpha(glow, 0.7)} 100%)`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 0.5,
        }}
      >
        <Typography
          noWrap
          sx={{ fontSize: '0.55rem', fontWeight: 900, color: '#fff', letterSpacing: '0.07em' }}
        >
          {t('memoryOf', { name })}
        </Typography>
        <Typography sx={{ fontSize: '0.6rem', fontWeight: 900, color: '#fff' }}>❤️</Typography>
      </Box>
      {scene ? (
        <Box
          component="img"
          src={scene}
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
            background: `radial-gradient(circle at 50% 45%, ${alpha('#fff', 0.85)} 0%, ${alpha(glow, 0.25)} 100%)`,
          }}
        >
          <Box
            component="img"
            src={buddyFaceSrc(entry.buddyKey, 1)}
            alt=""
            draggable={false}
            sx={{ width: '62%', height: 'auto', objectFit: 'contain' }}
          />
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
          sx={{
            fontWeight: 800,
            fontSize: { xs: '0.8rem', sm: '0.9rem' },
            lineHeight: 1.2,
            color: 'text.primary',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {title}
        </Typography>
        <Typography noWrap sx={{ fontSize: '0.68rem', color: 'text.secondary', mt: 0.25 }}>
          {levelName}
        </Typography>
      </Box>
    </CollectibleCardFrame>
  );
});

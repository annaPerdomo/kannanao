'use client';

import AutoStoriesRoundedIcon from '@mui/icons-material/AutoStoriesRounded';
import ChatBubbleRoundedIcon from '@mui/icons-material/ChatBubbleRounded';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

export interface LevelUpUnlocksProps {
  name: string;
  memoryTitle: string | null;
  hasMemory: boolean;
  phraseCount: number;
}

function Row({ icon, text }: { icon: ReactNode; text: string }) {
  const { brand } = useTheme().palette;
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.75,
        py: 1,
        borderRadius: 3,
        bgcolor: alpha(brand[100], 0.55),
        border: `1.5px solid ${alpha(brand[300], 0.45)}`,
      }}
    >
      {icon}
      <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'text.primary' }}>
        {text}
      </Typography>
    </Box>
  );
}

export function hasAnyUnlock({
  hasMemory,
  phraseCount,
}: Pick<LevelUpUnlocksProps, 'hasMemory' | 'phraseCount'>): boolean {
  return hasMemory || phraseCount > 0;
}

export function LevelUpUnlocks({ name, memoryTitle, hasMemory, phraseCount }: LevelUpUnlocksProps) {
  const t = useTranslations('Home.buddy.friendship');
  const { brand } = useTheme().palette;
  const iconSx = { fontSize: 17, color: brand[400], flexShrink: 0 };

  return (
    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: brand[700] }}>
        {t('celebration.unlocksHeading')}
      </Typography>

      {hasMemory && (
        <Row
          icon={<AutoStoriesRoundedIcon sx={iconSx} aria-hidden />}
          text={
            memoryTitle
              ? t('celebration.unlockMemory', { title: memoryTitle })
              : t('celebration.unlockMemoryUntitled')
          }
        />
      )}

      {phraseCount > 0 && (
        <Row
          icon={<ChatBubbleRoundedIcon sx={iconSx} aria-hidden />}
          text={t('celebration.unlockPhrases', { count: phraseCount, name })}
        />
      )}
    </Box>
  );
}

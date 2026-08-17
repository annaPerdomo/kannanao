'use client';

import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import {
  FIRST_STORY_LEVEL,
  memoryTeaser,
  memoryTitle,
  memoryWord,
  unlockedStories,
} from '@/lib/buddyPhrases';
import { MAX_FRIENDSHIP_LEVEL } from '@/lib/friendship';

import { MemoryWordChip } from './MemoryWordChip';
import { StoryBubble } from './StoryBubble';

interface MemoryListProps {
  copy: unknown;
  level: number;
}

export function MemoryList({ copy, level }: MemoryListProps) {
  const t = useTranslations('Home.buddy.friendship');
  const { brand } = useTheme().palette;

  const stories = unlockedStories(copy, level);
  const locked: number[] = [];
  for (let l = Math.max(FIRST_STORY_LEVEL, level + 1); l <= MAX_FRIENDSHIP_LEVEL; l++) {
    locked.push(l);
  }

  if (!stories.length && !locked.length) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        width: '100%',
        borderTop: `1px solid ${alpha(brand[300], 0.35)}`,
        pt: 1.75,
      }}
    >
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: brand[700] }}>
        {t('memories.heading')}
      </Typography>

      {stories.map((story) => {
        const word = memoryWord(copy, story.level);
        return (
          <Box key={story.level} sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, color: brand[800] }}>
              {memoryTitle(copy, story.level) ?? t(`levelNames.${story.level}`)}
            </Typography>
            {story.lines.map((line, i) => (
              <StoryBubble key={i} text={line} animate={false} />
            ))}
            {word && <MemoryWordChip word={word} />}
          </Box>
        );
      })}

      {locked.map((lockedLevel) => {
        const title = memoryTitle(copy, lockedLevel);
        const teaser = title ? memoryTeaser(copy, lockedLevel) : null;
        return (
          <Box
            key={lockedLevel}
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1,
              px: 1.75,
              py: 1,
              borderRadius: 3,
              bgcolor: alpha(brand[100], 0.4),
              border: `1.5px dashed ${alpha(brand[300], 0.55)}`,
            }}
          >
            <LockOutlinedIcon sx={{ fontSize: 15, color: brand[400], mt: 0.3 }} aria-hidden />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: 'text.primary' }}>
                {title ?? t('memories.lockedTitle')}
              </Typography>
              {teaser && (
                <Typography sx={{ fontSize: '0.8rem', lineHeight: 1.5, color: 'text.primary' }}>
                  {teaser}
                </Typography>
              )}
              <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                {t('memories.locked', { levelName: t(`levelNames.${lockedLevel}`) })}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

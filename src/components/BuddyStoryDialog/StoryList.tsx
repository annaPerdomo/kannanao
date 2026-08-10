'use client';

import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { unlockedStories } from '@/lib/buddyPhrases';
import { MAX_FRIENDSHIP_LEVEL } from '@/lib/friendship';

import { StoryBubble } from './StoryBubble';

interface StoryListProps {
  copy: unknown;
  level: number;
}

export function StoryList({ copy, level }: StoryListProps) {
  const t = useTranslations('Home.buddy.friendship');
  const { brand } = useTheme().palette;

  const stories = unlockedStories(copy, level);
  const ahead: number[] = [];
  for (let l = level + 1; l <= MAX_FRIENDSHIP_LEVEL; l++) ahead.push(l);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
      {stories.map((story) => (
        <Box key={story.level} sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: brand[700] }}>
            {t(`levelNames.${story.level}`)}
          </Typography>
          {story.lines.map((line, i) => (
            <StoryBubble key={i} text={line} animate={false} />
          ))}
        </Box>
      ))}

      {ahead.map((lockedLevel) => (
        <Box
          key={lockedLevel}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.75,
            py: 1,
            borderRadius: 3,
            bgcolor: alpha(brand[100], 0.4),
            border: `1.5px dashed ${alpha(brand[300], 0.55)}`,
          }}
        >
          <LockOutlinedIcon sx={{ fontSize: 15, color: brand[400] }} aria-hidden />
          <Typography sx={{ fontSize: '0.82rem', color: 'text.primary' }}>
            {t('lockedStory', { level: t(`levelNames.${lockedLevel}`) })}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

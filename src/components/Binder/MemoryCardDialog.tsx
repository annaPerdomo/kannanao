'use client';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { useTranslations } from 'next-intl';

import { MemoryWordChip, StoryBubble } from '@/components/BuddyFriendship';
import { StyledDialog } from '@/components/StyledDialog';
import type { MemoryCardEntry } from '@/lib/binderMemories';
import { buddyFaceSrc, buddyMemorySrc } from '@/lib/buddies';

interface MemoryCardDialogProps {
  entry: MemoryCardEntry | null;
  name: string;
  onClose: () => void;
}

export function MemoryCardDialog({ entry, name, onClose }: MemoryCardDialogProps) {
  const t = useTranslations('Binder.memories.detail');
  const tFriendship = useTranslations('Home.buddy.friendship');
  const levelName = entry ? tFriendship(`levelNames.${entry.level}`) : '';
  const scene = entry ? buddyMemorySrc(entry.buddyKey, entry.level) : null;

  return (
    <StyledDialog
      open={entry !== null}
      onClose={onClose}
      title={entry?.title ?? levelName}
      subtitle={entry ? t('subtitle', { name, levelName }) : undefined}
      icon={
        entry ? (
          <Box
            component="img"
            src={buddyFaceSrc(entry.buddyKey, 1)}
            alt=""
            sx={{ width: 32, height: 32, objectFit: 'contain' }}
          />
        ) : undefined
      }
      maxWidth="xs"
      titleId="binder-memory-title"
    >
      {entry && (
        <Stack spacing={1} alignItems="flex-start">
          {scene && (
            <Box
              component="img"
              src={scene}
              alt=""
              sx={{
                width: '100%',
                aspectRatio: '4 / 3',
                objectFit: 'cover',
                borderRadius: 3,
                mb: 1,
              }}
            />
          )}
          {entry.lines.map((line, i) => (
            <StoryBubble key={i} text={line} animate={false} />
          ))}
          {entry.word && <MemoryWordChip word={entry.word} />}
        </Stack>
      )}
    </StyledDialog>
  );
}

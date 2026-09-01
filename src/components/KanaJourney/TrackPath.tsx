'use client';
import { Box, Stack, Tab, Tabs, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useTranslations } from 'next-intl';

import type { KanaTrack } from '@/lib/kanaCurriculum';
import {
  buildIslands,
  isTrackUnlocked,
  type KanaProgressMap,
  TRACK_UNLOCK_SETS,
  trackUnlockProgress,
} from '@/lib/kanaProficiency';

import { IslandButton } from './IslandButton';

interface TrackPathProps {
  track: KanaTrack;
  byKana: KanaProgressMap;
  onTrackChange: (track: KanaTrack) => void;
  onPlay: (setId: string) => void;
}

export function TrackPath({ track, byKana, onTrackChange, onPlay }: TrackPathProps) {
  const t = useTranslations('KanaJourney.journey');
  const katakanaOpen = isTrackUnlocked('katakana', byKana);
  const islands = buildIslands(track, byKana);

  return (
    <Box>
      <Tabs
        value={track}
        onChange={(_, value: KanaTrack) => onTrackChange(value)}
        variant="fullWidth"
        sx={{ mb: 2 }}
      >
        <Tab value="hiragana" label={t('hiraganaTrack')} />
        <Tab
          value="katakana"
          label={t('katakanaTrack')}
          disabled={!katakanaOpen}
          aria-label={
            katakanaOpen
              ? undefined
              : t('katakanaLockedLabel', {
                  done: trackUnlockProgress(byKana),
                  total: TRACK_UNLOCK_SETS,
                })
          }
        />
      </Tabs>

      {!katakanaOpen && track === 'hiragana' && (
        <Typography
          variant="body2"
          sx={{
            mb: 2,
            px: 2,
            py: 1.25,
            borderRadius: 3,
            color: 'text.secondary',
            bgcolor: (th) => alpha(th.palette.brand[50], 0.7),
          }}
        >
          {t('katakanaLockedHint', {
            done: trackUnlockProgress(byKana),
            total: TRACK_UNLOCK_SETS,
          })}
        </Typography>
      )}

      <Stack spacing={1.25} component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
        {islands.map((island) => (
          <Box component="li" key={island.set.id}>
            <IslandButton island={island} onPlay={onPlay} />
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

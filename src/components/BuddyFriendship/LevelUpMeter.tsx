'use client';

import Box from '@mui/material/Box';
import { useEffect, useState } from 'react';

import { FriendshipMeter } from '@/components/FriendshipMeter';
import { LEVEL_THRESHOLDS, MAX_FRIENDSHIP_LEVEL } from '@/lib/friendship';

const FILL_MS = 160;
const ROLL_MS = 1000;

interface LevelUpMeterProps {
  level: number;
  reduced: boolean;
}

export function LevelUpMeter({ level, reduced }: LevelUpMeterProps) {
  const [phase, setPhase] = useState<'start' | 'full' | 'rolled'>(reduced ? 'rolled' : 'start');

  useEffect(() => {
    // Land on 'rolled', don't just bail: if reduced turns on after mount,
    // returning early strands the meter mid-fill on the old level.
    if (reduced) {
      setPhase('rolled');
      return;
    }
    const fill = setTimeout(() => setPhase('full'), FILL_MS);
    const roll = setTimeout(() => setPhase('rolled'), ROLL_MS);
    return () => {
      clearTimeout(fill);
      clearTimeout(roll);
    };
  }, [reduced]);

  const reached = Math.min(Math.max(level, 1), MAX_FRIENDSHIP_LEVEL);
  const points = LEVEL_THRESHOLDS[reached - 1];
  const rolled = phase === 'rolled';

  return (
    // Keyed so the roll remounts the bar: without it the track would animate
    // backwards from full to the new level's empty start.
    <Box key={rolled ? 'new' : 'old'} sx={{ width: '100%' }}>
      {rolled ? (
        <FriendshipMeter points={points} />
      ) : (
        <FriendshipMeter
          points={points}
          display={{ level: Math.max(1, reached - 1), value: phase === 'full' ? 100 : 68 }}
        />
      )}
    </Box>
  );
}

'use client';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { MODE_EMOJI } from '@/lib/chainModes';
import type { LegReason } from '@/lib/demo';
import type { ChainLeg, ChainMode } from '@/lib/practiceChain';

import { useModeName } from './useModeName';

export interface TodayPlanProps {
  title: string;
  legs: LegReason[];
  dropped: ChainLeg[];
  addedModes?: ChainMode[];
  removedModes?: ChainMode[];
}

export function TodayPlan({
  title,
  legs,
  dropped,
  addedModes = [],
  removedModes = [],
}: TodayPlanProps) {
  const t = useTranslations('DemoLab');
  const tReason = useTranslations('DemoLab.reasons');
  const modeName = useModeName();
  const droppedModes = new Set(dropped.map((leg) => leg.mode));
  const stillRemoved = removedModes.filter((mode) => !droppedModes.has(mode));

  return (
    <Box>
      <Typography
        component="h3"
        sx={{ fontWeight: 700, fontSize: '0.95rem', color: 'text.primary', mb: 1 }}
      >
        {title}
      </Typography>
      <Stack spacing={1}>
        {legs.map(({ leg, reason, values }, i) => (
          <Stack key={`${leg.mode}-${i}`} direction="row" spacing={1} alignItems="flex-start">
            <Typography aria-hidden sx={{ fontSize: '1.1rem', lineHeight: 1.4 }}>
              {MODE_EMOJI[leg.mode]}
            </Typography>
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'text.primary' }}>
                  {modeName(leg.mode)}
                </Typography>
                {addedModes.includes(leg.mode) && (
                  <Chip size="small" color="success" label={t('newBadge')} sx={{ height: 20 }} />
                )}
              </Stack>
              <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                {tReason(reason, values)}
              </Typography>
            </Box>
          </Stack>
        ))}
      </Stack>
      {dropped.length > 0 && (
        <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mt: 1.5 }}>
          {t('leftOut', { modes: dropped.map((leg) => modeName(leg.mode)).join(', ') })}
        </Typography>
      )}
      {stillRemoved.length > 0 && (
        <Stack sx={{ mt: 0.5 }}>
          {stillRemoved.map((mode, i) => (
            <Typography key={`${mode}-${i}`} sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
              {t('notInTomorrowsPlan', { mode: modeName(mode) })}
            </Typography>
          ))}
        </Stack>
      )}
    </Box>
  );
}

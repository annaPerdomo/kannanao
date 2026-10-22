'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { BuddyFace } from '@/components/TodayAdventureCard/AdventureStates';

import { BonusChips } from './BonusChips';

export interface DoneBodyProps {
  buddyName: string;
  faceSrc: string;
  dueCount: number;
  /** Words are due and a bonus round can still be played today. */
  offerBonus: boolean;
  showBonusHearts: boolean;
  onBonus: () => void;
  onMorePractice: () => void;
  onFinish: () => void;
}

export function DoneBody({
  buddyName,
  faceSrc,
  dueCount,
  offerBonus,
  showBonusHearts,
  onBonus,
  onMorePractice,
  onFinish,
}: DoneBodyProps) {
  const t = useTranslations('PracticeDone.done');

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Box
        sx={{
          width: 72,
          height: 72,
          mx: 'auto',
          mb: 2,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: (t) => t.palette.brand[50],
          border: (t) => `2px solid ${t.palette.brand[200]}`,
        }}
      >
        <BuddyFace src={faceSrc} />
      </Box>

      <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', mb: 1 }}>
        {t('heading')}
      </Typography>

      {dueCount > 0 ? (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {t('waiting', { count: dueCount })}
        </Typography>
      ) : (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {t('allCaught')}
        </Typography>
      )}

      {offerBonus ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
          <Button
            variant="contained"
            size="large"
            onClick={onBonus}
            sx={{ borderRadius: 999, px: 4 }}
          >
            {t('bonusButton')}
          </Button>
          <BonusChips buddyName={buddyName} showHearts={showBonusHearts} />
        </Box>
      ) : (
        <Button
          variant="outlined"
          size="large"
          onClick={onMorePractice}
          sx={{ borderRadius: 999, px: 4 }}
        >
          {t('morePractice')}
        </Button>
      )}

      <Box sx={{ mt: 3 }}>
        <Button variant="text" onClick={onFinish}>
          {t('finish')}
        </Button>
      </Box>
    </Box>
  );
}

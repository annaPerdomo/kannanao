'use client';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';

import { setsForTrack } from '@/lib/kanaCurriculum';
import {
  isNewLearner,
  type KanaProgressMap,
  type KanaStrengthState,
  needsReviewCount,
} from '@/lib/kanaProficiency';

import { stateTint } from './constants';

const LEGEND: KanaStrengthState[] = ['new', 'learning', 'rusty', 'solid'];

function Legend() {
  const t = useTranslations('KanaJourney.journey');
  const theme = useTheme();
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ justifyContent: 'center' }}>
      {LEGEND.map((state) => (
        <Typography
          key={state}
          component="span"
          sx={{
            px: 1,
            py: 0.25,
            borderRadius: 1.5,
            fontSize: '0.7rem',
            color: 'text.primary',
            ...stateTint(theme, state),
          }}
        >
          {t(`state.${state}`)}
        </Typography>
      ))}
    </Stack>
  );
}

interface ReviewButtonProps {
  byKana: KanaProgressMap;
  onReview: () => void;
  onCheck: () => void;
}

export function ReviewButton({ byKana, onReview, onCheck }: ReviewButtonProps) {
  const t = useTranslations('KanaJourney.journey');
  const count = needsReviewCount(byKana);
  const beginner = isNewLearner(byKana);

  return (
    <Stack spacing={1.25} sx={{ alignItems: 'center', mb: 3 }}>
      <Button variant="contained" size="large" onClick={onReview} sx={{ borderRadius: 999, px: 5 }}>
        {t('review')}
      </Button>
      <Box sx={{ textAlign: 'center' }}>
        {(count > 0 || !beginner) && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {count > 0 ? t('reviewSubtitle', { count }) : t('reviewNothing')}
          </Typography>
        )}
        {beginner && (
          <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600, mt: 0.5 }}>
            {t('startHint', { kana: setsForTrack('hiragana')[0].label })}
          </Typography>
        )}
      </Box>
      <Stack spacing={0.5} sx={{ alignItems: 'center' }}>
        <Button variant={beginner ? 'outlined' : 'text'} size="small" onClick={onCheck}>
          {t('check')}
        </Button>
        {beginner && (
          <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
            {t('checkHint')}
          </Typography>
        )}
      </Stack>

      <Legend />
    </Stack>
  );
}

'use client';
import { Alert } from '@mui/material';
import { useTranslations } from 'next-intl';

import type { FillImagesResult } from '@/hooks/useDeckImages';

interface PictureRunFeedbackProps {
  filling: boolean;
  result: FillImagesResult | null;
  error: string | null;
}

export function PictureRunFeedback({ filling, result, error }: PictureRunFeedbackProps) {
  const t = useTranslations('Deck.settingsDialog');

  if (filling) return null;

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 1.5, fontSize: '0.78rem', py: 0 }}>
        {result && result.added > 0
          ? t('imagesErrorPartial', { count: result.added })
          : t('imagesError')}
      </Alert>
    );
  }

  if (!result) return null;

  // `missed` is what the run never asked Unsplash about, so those cards aren't
  // "no picture found" — saying so would send the owner off to draw their own.
  const severity = result.rateLimited || result.missed > 0 ? 'warning' : 'info';

  return (
    <Alert
      severity={result.added > 0 && severity === 'info' ? 'success' : severity}
      sx={{ mt: 1.5, fontSize: '0.78rem', py: 0 }}
    >
      {result.rateLimited
        ? t('imagesRanOut', { count: result.added })
        : result.missed > 0
          ? t('imagesStopped', { count: result.missed })
          : result.added > 0
            ? t('imagesAdded', { count: result.added })
            : t('imagesNoneFound')}
    </Alert>
  );
}

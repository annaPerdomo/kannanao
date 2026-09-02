'use client';
import PrintIcon from '@mui/icons-material/Print';
import Button from '@mui/material/Button';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { buildKanaChartPrintableHtml } from '@/lib/kanaChartPrintable';
import type { KanaTrack } from '@/lib/kanaCurriculum';
import { openPrintWindow } from '@/lib/lessonPrintable';

interface KanaChartPrintButtonProps {
  track: KanaTrack;
}

export function KanaChartPrintButton({ track }: KanaChartPrintButtonProps) {
  const t = useTranslations('KanaJourney.journey');
  const tContextual = useTranslations('KanaJourney.contextual');
  const locale = useLocale();

  const print = useCallback(() => {
    const script = t(track === 'katakana' ? 'katakanaTrack' : 'hiraganaTrack');
    openPrintWindow(
      buildKanaChartPrintableHtml({
        locale,
        options: { script: track, romaji: true, blank: false },
        labels: {
          title: t('printChartTitle', { script }),
          hint: t('printChartHint'),
          markedBlock: t('markedBlock'),
          comboBlock: t('comboBlock'),
          contextualBlock: t('contextualBlock'),
          contextual: {
            littleTsu: tContextual('littleTsu'),
            longSound: tContextual('longSound'),
          },
        },
      }),
    );
  }, [locale, t, tContextual, track]);

  return (
    <Button
      onClick={print}
      startIcon={<PrintIcon sx={{ fontSize: 18 }} />}
      sx={{ textTransform: 'none', fontWeight: 700, alignSelf: 'flex-start' }}
    >
      {t('printChart')}
    </Button>
  );
}

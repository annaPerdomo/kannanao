'use client';
import PrintIcon from '@mui/icons-material/Print';
import QuizIcon from '@mui/icons-material/Quiz';
import Button from '@mui/material/Button';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback } from 'react';

import { includedPlan } from '@/lib/lessonPlanEdits';
import {
  buildLessonPrintableHtml,
  openPrintWindow,
  type PrintableVariant,
} from '@/lib/lessonPrintable';
import type { LessonPlan, WarmUpWord } from '@/types/lessonPlan';

interface PrintButtonsProps {
  plan: LessonPlan;
  warmUp?: WarmUpWord[];
  disabled?: boolean;
}

/** "Print study sheets" / "Print quiz sheets" — paper handouts from the same plan. */
export function PrintButtons({ plan, warmUp, disabled }: PrintButtonsProps) {
  const t = useTranslations('Group.lessonBuilder');
  const locale = useLocale();

  const handlePrint = useCallback(
    (variant: PrintableVariant) => {
      const kept = includedPlan(plan);
      if (kept.decks.length === 0) return;

      const html = buildLessonPrintableHtml({
        title: variant === 'study' ? t('printStudyTitle') : t('printQuizTitle'),
        locale,
        variant,
        weeks: kept.decks.map((deck, i) => ({
          heading: `${t('weekHeading', { week: i + 1 })} — ${deck.name}`,
          deck,
        })),
        labels: {
          name: t('printNameLabel'),
          date: t('printDateLabel'),
          word: t('wordLabel'),
          reading: t('readingLabel'),
          meaning: t('meaningLabel'),
          example: t('printExampleLabel'),
          warmUpTitle: t('warmUpTitle'),
          warmUpHint: t('warmUpHint'),
          deck: t('warmUpDeckColumn'),
        },
        warmUp,
      });
      openPrintWindow(html);
    },
    [plan, warmUp, locale, t],
  );

  return (
    <>
      <Button
        startIcon={<PrintIcon sx={{ fontSize: 18 }} />}
        onClick={() => handlePrint('study')}
        disabled={disabled}
        sx={{ textTransform: 'none', fontWeight: 700 }}
      >
        {t('printStudyButton')}
      </Button>
      <Button
        startIcon={<QuizIcon sx={{ fontSize: 18 }} />}
        onClick={() => handlePrint('quiz')}
        disabled={disabled}
        sx={{ textTransform: 'none', fontWeight: 700 }}
      >
        {t('printQuizButton')}
      </Button>
    </>
  );
}

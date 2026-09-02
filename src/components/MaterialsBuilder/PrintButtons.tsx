'use client';
import PrintIcon from '@mui/icons-material/Print';
import QuizIcon from '@mui/icons-material/Quiz';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { includedPlan } from '@/lib/lessonPlanEdits';
import {
  buildLessonPrintableHtml,
  openPrintWindow,
  type PrintableVariant,
} from '@/lib/lessonPrintable';
import type { LessonPlan, WarmUpWord } from '@/types/lessonPlan';

import { loadKanaSheetPreference, saveKanaSheetPreference } from './kanaSheetPreference';

interface PrintButtonsProps {
  plan: LessonPlan;
  warmUp?: WarmUpWord[];
  kanaSets?: string[];
  disabled?: boolean;
}

/** "Print study sheets" / "Print quiz sheets" — paper handouts from the same plan. */
export function PrintButtons({ plan, warmUp, kanaSets, disabled }: PrintButtonsProps) {
  const t = useTranslations('Group.lessonBuilder');
  const tContextual = useTranslations('KanaJourney.contextual');
  const locale = useLocale();

  // Read after mount: the server render has no localStorage and would mismatch.
  const [includeKana, setIncludeKana] = useState(true);
  useEffect(() => setIncludeKana(loadKanaSheetPreference()), []);

  const handleKanaChange = useCallback((include: boolean) => {
    setIncludeKana(include);
    saveKanaSheetPreference(include);
  }, []);

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
          kanaTitle: t('printKanaTitle'),
          kanaHint: t('printKanaHint'),
          kanaContextual: {
            littleTsu: tContextual('littleTsu'),
            longSound: tContextual('longSound'),
          },
        },
        warmUp,
        kanaSets: includeKana ? kanaSets : [],
      });
      openPrintWindow(html);
    },
    [plan, warmUp, kanaSets, includeKana, locale, t, tContextual],
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
      {!!kanaSets?.length && (
        <FormControlLabel
          control={
            <Checkbox
              checked={includeKana}
              onChange={(e) => handleKanaChange(e.target.checked)}
              size="small"
            />
          }
          label={
            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
              {t('printKanaToggle')}
            </Typography>
          }
        />
      )}
    </>
  );
}

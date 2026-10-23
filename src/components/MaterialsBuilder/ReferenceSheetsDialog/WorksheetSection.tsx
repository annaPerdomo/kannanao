'use client';
import PrintIcon from '@mui/icons-material/Print';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import { openPrintWindow } from '@/lib/lessonPrintable';
import { buildWorksheetHtml, hasWorksheetContent } from '@/lib/worksheetPrintable';
import type { LessonPlan } from '@/types/lessonPlan';

interface WorksheetSectionProps {
  plan: LessonPlan;
  locale: string;
  onPopupBlocked: (blocked: boolean) => void;
}

export function WorksheetSection({ plan, locale, onPopupBlocked }: WorksheetSectionProps) {
  const t = useTranslations('Group.lessonBuilder');

  const [furigana, setFurigana] = useState(true);
  const [answerKey, setAnswerKey] = useState(true);

  const hasContent = useMemo(() => hasWorksheetContent(plan), [plan]);

  const printWorksheet = useCallback(() => {
    const html = buildWorksheetHtml({
      locale,
      plan,
      labels: {
        title: t('sheetsWorksheetTitle'),
        name: t('printNameLabel'),
        date: t('printDateLabel'),
        matchHeading: t('worksheetMatchHeading'),
        matchHint: t('worksheetMatchHint'),
        blankHeading: t('worksheetBlankHeading'),
        blankHint: t('worksheetBlankHint'),
        wordBank: t('worksheetWordBank'),
        answerKey: t('worksheetAnswerKey'),
      },
      options: { furigana, answerKey },
    });
    onPopupBlocked(!openPrintWindow(html));
  }, [answerKey, furigana, locale, onPopupBlocked, plan, t]);

  return (
    <Stack spacing={1}>
      <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
        {t('sheetsWorksheetTitle')}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('sheetsWorksheetHint')}
      </Typography>
      <Stack>
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={furigana}
              onChange={(e) => setFurigana(e.target.checked)}
            />
          }
          label={t('sheetsFlashFurigana')}
        />
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={answerKey}
              onChange={(e) => setAnswerKey(e.target.checked)}
            />
          }
          label={t('sheetsWorksheetAnswerKey')}
        />
      </Stack>
      {!hasContent && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('sheetsWorksheetEmpty')}
        </Typography>
      )}
      <Button
        variant="outlined"
        startIcon={<PrintIcon sx={{ fontSize: 18 }} />}
        onClick={printWorksheet}
        disabled={!hasContent}
      >
        {t('sheetsWorksheetButton')}
      </Button>
    </Stack>
  );
}

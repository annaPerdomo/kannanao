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
import { buildReadingCheckHtml, hasReadingCheckContent } from '@/lib/readingCheckPrintable';
import type { LessonPlan } from '@/types/lessonPlan';

interface ReadingCheckSectionProps {
  plan: LessonPlan;
  locale: string;
  onPopupBlocked: (blocked: boolean) => void;
}

export function ReadingCheckSection({ plan, locale, onPopupBlocked }: ReadingCheckSectionProps) {
  const t = useTranslations('Group.lessonBuilder');
  const [answerKey, setAnswerKey] = useState(true);
  const hasContent = useMemo(() => hasReadingCheckContent(plan), [plan]);

  const printCheck = useCallback(() => {
    const html = buildReadingCheckHtml({
      locale,
      plan,
      seed: Date.now(),
      answerKey,
      labels: {
        title: t('sheetsReadingCheckTitle'),
        name: t('printNameLabel'),
        date: t('printDateLabel'),
        judgeHeading: t('readingCheckJudgeHeading'),
        judgeHint: t('readingCheckJudgeHint'),
        judgeRight: t('readingCheckJudgeRight'),
        gapHeading: t('readingCheckGapHeading'),
        gapHint: t('readingCheckGapHint'),
        writeHeading: t('readingCheckWriteHeading'),
        writeHint: t('readingCheckWriteHint'),
        answerKey: t('worksheetAnswerKey'),
        empty: t('sheetsReadingCheckEmpty'),
      },
    });
    onPopupBlocked(!openPrintWindow(html));
  }, [answerKey, locale, onPopupBlocked, plan, t]);

  return (
    <Stack spacing={1}>
      <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>
        {t('sheetsReadingCheckTitle')}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('sheetsReadingCheckHint')}
      </Typography>
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
      {!hasContent && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('sheetsReadingCheckEmpty')}
        </Typography>
      )}
      <Button
        variant="outlined"
        startIcon={<PrintIcon sx={{ fontSize: 18 }} />}
        onClick={printCheck}
        disabled={!hasContent}
      >
        {t('sheetsReadingCheckButton')}
      </Button>
    </Stack>
  );
}

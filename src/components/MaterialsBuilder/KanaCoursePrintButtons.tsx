'use client';
import PrintIcon from '@mui/icons-material/Print';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { buildKanaChartPrintableHtml, type KanaSheetLabels } from '@/lib/kanaChartPrintable';
import { openPrintWindow } from '@/lib/lessonPrintable';

interface KanaCoursePrintButtonsProps {
  setIds: string[];
}

export function KanaCoursePrintButtons({ setIds }: KanaCoursePrintButtonsProps) {
  const t = useTranslations('Materials.kanaCourse');
  const tBuilder = useTranslations('Group.lessonBuilder');
  const tJourney = useTranslations('KanaJourney.journey');
  const tContextual = useTranslations('KanaJourney.contextual');
  const locale = useLocale();
  const [popupBlocked, setPopupBlocked] = useState(false);

  const print = useCallback(
    (blank: boolean) => {
      const labels: KanaSheetLabels = {
        title: blank ? t('printBlankTitle') : t('printWeekTitle'),
        name: tBuilder('printNameLabel'),
        date: tBuilder('printDateLabel'),
        markedBlock: tJourney('markedBlock'),
        comboBlock: tJourney('comboBlock'),
        contextualBlock: tJourney('contextualBlock'),
        contextual: {
          littleTsu: tContextual('littleTsu'),
          longSound: tContextual('longSound'),
        },
      };
      setPopupBlocked(
        !openPrintWindow(
          buildKanaChartPrintableHtml({
            locale,
            options: { script: 'both', romaji: !blank, blank, setIds },
            labels,
          }),
        ),
      );
    },
    [setIds, locale, t, tBuilder, tJourney, tContextual],
  );

  if (setIds.length === 0) return null;

  return (
    <Stack spacing={1} sx={{ mt: 1.5 }}>
      <Stack direction="row" gap={1} flexWrap="wrap">
        <Button size="small" startIcon={<PrintIcon />} onClick={() => print(false)}>
          {t('printWeekButton')}
        </Button>
        <Button size="small" startIcon={<PrintIcon />} onClick={() => print(true)}>
          {t('printBlankButton')}
        </Button>
      </Stack>
      {popupBlocked && <Alert severity="warning">{tBuilder('sheetsPopupBlocked')}</Alert>}
    </Stack>
  );
}

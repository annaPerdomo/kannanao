'use client';
import PrintIcon from '@mui/icons-material/Print';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { QRCodeSVG } from 'qrcode.react';
import { createElement, useCallback, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';

import { APP_NAME, APP_URL } from '@/lib/brand';
import { buildHomePracticeHtml } from '@/lib/homePracticePrintable';
import { openPrintWindow } from '@/lib/lessonPrintable';
import { printableDecks } from '@/lib/printPlan';
import type { LessonPlan } from '@/types/lessonPlan';

interface HomePracticeSectionProps {
  plan: LessonPlan;
  locale: string;
  onPopupBlocked: (blocked: boolean) => void;
}

export function HomePracticeSection({ plan, locale, onPopupBlocked }: HomePracticeSectionProps) {
  const t = useTranslations('Group.lessonBuilder');

  const [furigana, setFurigana] = useState(true);

  const decks = useMemo(() => printableDecks(plan), [plan]);

  const printHomePractice = useCallback(() => {
    const url = `${APP_URL}/review/start`;
    const host = document.createElement('div');
    const root = createRoot(host);
    flushSync(() => {
      root.render(createElement(QRCodeSVG, { value: url, size: 112, level: 'M', marginSize: 4 }));
    });
    const svg = host.innerHTML;
    root.unmount();

    const html = buildHomePracticeHtml({
      locale,
      plan,
      labels: {
        title: t('sheetsHomeTitle'),
        name: t('printNameLabel'),
        date: t('printDateLabel'),
        wordsHeading: t('homeWordsHeading'),
        sayIt: t('homeSayIt'),
        writeIt: t('homeWriteIt'),
        trackerHeading: t('homeTrackerHeading'),
        trackerApp: t('homeTrackerApp'),
        trackerPaper: t('homeTrackerPaper'),
        days: t('homeDays').split('|'),
        checkedBy: t('homeCheckedBy'),
        scan: t('homeScan', { app: APP_NAME }),
      },
      options: { furigana },
      qr: { svg, url },
    });
    onPopupBlocked(!openPrintWindow(html));
  }, [furigana, locale, onPopupBlocked, plan, t]);

  return (
    <Stack spacing={1}>
      <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{t('sheetsHomeTitle')}</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('sheetsHomeHint')}
      </Typography>
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
      {decks.length === 0 && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('sheetsHomeEmpty')}
        </Typography>
      )}
      <Button
        variant="outlined"
        startIcon={<PrintIcon sx={{ fontSize: 18 }} />}
        onClick={printHomePractice}
        disabled={decks.length === 0}
      >
        {t('sheetsHomeButton')}
      </Button>
    </Stack>
  );
}

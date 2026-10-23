'use client';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import { buildKanjiSheetHtml } from '@/lib/kanjiSheetPrintable';
import { fetchKanjiStrokes, type KanjiStrokes, uniqueKanji } from '@/lib/kanjiStrokes';
import { includedPlan } from '@/lib/lessonPlanEdits';
import { escapeHtml, openBlankPrintWindow, writePrintWindow } from '@/lib/lessonPrintable';
import type { LessonPlan } from '@/types/lessonPlan';

interface KanjiSheetSectionProps {
  plan: LessonPlan;
  locale: string;
  onPopupBlocked: (blocked: boolean) => void;
}

function loadingPageHtml(text: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"></head><body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;color:#555"><p>${escapeHtml(text)}</p></body></html>`;
}

export function KanjiSheetSection({ plan, locale, onPopupBlocked }: KanjiSheetSectionProps) {
  const t = useTranslations('Group.lessonBuilder');

  const [furigana, setFurigana] = useState(true);
  const [strokeOrder, setStrokeOrder] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const hasKanjiSource = useMemo(() => includedPlan(plan).decks.length > 0, [plan]);

  const printKanji = useCallback(() => {
    const win = openBlankPrintWindow();
    if (!win) {
      onPopupBlocked(true);
      return;
    }
    onPopupBlocked(false);
    setError(false);
    setLoading(true);

    void (async () => {
      try {
        writePrintWindow(win, loadingPageHtml(t('sheetsKanjiLoading')));

        const kept = includedPlan(plan);
        const kanji = uniqueKanji(
          kept.decks.flatMap((deck) => deck.cards.map((c) => c.word)).join(''),
        );
        const strokes: Map<string, KanjiStrokes> = strokeOrder
          ? await fetchKanjiStrokes(kanji)
          : new Map();

        if (win.closed) return;

        writePrintWindow(
          win,
          buildKanjiSheetHtml({
            locale,
            weeks: kept.decks.map((deck, i) => ({
              heading: `${t('weekHeading', { week: i + 1 })} — ${deck.name}`,
              deck,
            })),
            labels: {
              title: t('sheetsKanjiTitle'),
              name: t('printNameLabel'),
              date: t('printDateLabel'),
              empty: t('sheetsKanjiEmpty'),
              strokeCount: (count) => t('sheetsKanjiStrokes', { count }),
              watch: t('sheetsKanjiWatch'),
              credit: t('sheetsKanjiCredit'),
            },
            options: { furigana, strokeOrder },
            strokes,
          }),
        );
      } catch {
        win.close();
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [furigana, locale, onPopupBlocked, plan, strokeOrder, t]);

  return (
    <Stack spacing={1}>
      {error && <Alert severity="error">{t('sheetsKanjiError')}</Alert>}
      <Stack>
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={furigana}
              onChange={(e) => setFurigana(e.target.checked)}
            />
          }
          label={t('sheetsKanjiFurigana')}
        />
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={strokeOrder}
              onChange={(e) => setStrokeOrder(e.target.checked)}
            />
          }
          label={t('sheetsKanjiStrokeOrder')}
        />
      </Stack>
      <Button variant="outlined" onClick={printKanji} disabled={!hasKanjiSource || loading}>
        {loading ? t('sheetsKanjiLoading') : t('sheetsKanjiButton')}
      </Button>
    </Stack>
  );
}

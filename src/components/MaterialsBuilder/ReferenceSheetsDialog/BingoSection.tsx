'use client';
import PrintIcon from '@mui/icons-material/Print';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import { bingoPool, bingoSize, buildBingoHtml } from '@/lib/bingoPrintable';
import { openPrintWindow } from '@/lib/lessonPrintable';
import type { LessonPlan } from '@/types/lessonPlan';

const DEFAULT_COPIES = 10;

function clampCopiesInput(raw: string): number {
  const parsed = Math.floor(Number(raw));
  if (raw.trim() === '' || !Number.isFinite(parsed)) return DEFAULT_COPIES;
  return Math.min(40, Math.max(1, parsed));
}

interface BingoSectionProps {
  plan: LessonPlan;
  locale: string;
  onPopupBlocked: (blocked: boolean) => void;
}

export function BingoSection({ plan, locale, onPopupBlocked }: BingoSectionProps) {
  const t = useTranslations('Group.lessonBuilder');

  const [furigana, setFurigana] = useState(true);
  const [copiesInput, setCopiesInput] = useState(String(DEFAULT_COPIES));

  const poolSize = useMemo(() => bingoPool(plan, true).length, [plan]);
  const size = useMemo(() => bingoSize(poolSize), [poolSize]);

  const printBingo = useCallback(() => {
    const copies = clampCopiesInput(copiesInput);
    setCopiesInput(String(copies));
    const html = buildBingoHtml({
      locale,
      plan,
      labels: {
        title: t('sheetsBingoTitle'),
        name: t('printNameLabel'),
        date: t('printDateLabel'),
        free: t('bingoFree'),
        callerTitle: t('bingoCallerTitle'),
        callerHint: t('bingoCallerHint'),
        called: t('bingoCalled'),
      },
      options: { furigana, copies },
    });
    onPopupBlocked(!openPrintWindow(html));
  }, [copiesInput, furigana, locale, onPopupBlocked, plan, t]);

  return (
    <Stack spacing={1}>
      <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{t('sheetsBingoTitle')}</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('sheetsBingoHint')}
      </Typography>
      <Stack direction="row" spacing={2} alignItems="center">
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
        <TextField
          type="number"
          size="small"
          label={t('sheetsBingoCopies')}
          value={copiesInput}
          onChange={(e) => setCopiesInput(e.target.value)}
          onBlur={() => setCopiesInput(String(clampCopiesInput(copiesInput)))}
          slotProps={{ htmlInput: { min: 1, max: 40 } }}
          sx={{ width: 120 }}
        />
      </Stack>
      {size === null ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('sheetsBingoEmpty', { count: 9 - poolSize })}
        </Typography>
      ) : (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('sheetsBingoGrid', { size })}
        </Typography>
      )}
      <Button
        variant="outlined"
        startIcon={<PrintIcon sx={{ fontSize: 18 }} />}
        onClick={printBingo}
        disabled={size === null}
      >
        {t('sheetsBingoButton')}
      </Button>
    </Stack>
  );
}

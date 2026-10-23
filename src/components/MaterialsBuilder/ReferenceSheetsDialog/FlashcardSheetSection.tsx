'use client';
import PrintIcon from '@mui/icons-material/Print';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import { buildFlashcardSheetHtml } from '@/lib/flashcardsPrintable';
import { openPrintWindow } from '@/lib/lessonPrintable';
import { printableDecks, safeImageUrl } from '@/lib/printPlan';
import type { LessonPlan } from '@/types/lessonPlan';

interface FlashcardSheetSectionProps {
  plan: LessonPlan;
  locale: string;
  onPopupBlocked: (blocked: boolean) => void;
}

export function FlashcardSheetSection({
  plan,
  locale,
  onPopupBlocked,
}: FlashcardSheetSectionProps) {
  const t = useTranslations('Group.lessonBuilder');

  const [furigana, setFurigana] = useState(true);
  const [pictures, setPictures] = useState(true);

  const decks = useMemo(() => printableDecks(plan), [plan]);
  const hasImages = useMemo(
    () => decks.some((deck) => deck.cards.some((card) => safeImageUrl(card.imageUrl))),
    [decks],
  );

  const printFlashcards = useCallback(() => {
    const html = buildFlashcardSheetHtml({
      locale,
      plan,
      labels: { title: t('sheetsFlashTitle'), fold: t('sheetsFlashFold') },
      options: { furigana, pictures: pictures && hasImages },
    });
    onPopupBlocked(!openPrintWindow(html));
  }, [furigana, hasImages, locale, onPopupBlocked, pictures, plan, t]);

  return (
    <Stack spacing={1}>
      <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{t('sheetsFlashTitle')}</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('sheetsFlashHint')}
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
        {hasImages && (
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={pictures}
                onChange={(e) => setPictures(e.target.checked)}
              />
            }
            label={t('sheetsFlashPictures')}
          />
        )}
      </Stack>
      {decks.length === 0 && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('sheetsFlashEmpty')}
        </Typography>
      )}
      <Button
        variant="outlined"
        startIcon={<PrintIcon sx={{ fontSize: 18 }} />}
        onClick={printFlashcards}
        disabled={decks.length === 0}
      >
        {t('sheetsFlashButton')}
      </Button>
    </Stack>
  );
}

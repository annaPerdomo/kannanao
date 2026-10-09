'use client';
import AutoFixHighRounded from '@mui/icons-material/AutoFixHighRounded';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { fillEmptyFields } from '@/lib/lessonAi';
import { generateFlashcards } from '@/services/api';
import type { Flashcard } from '@/types/flashcard';

interface FillWithAiButtonProps {
  card: Flashcard;
  disabled?: boolean;
  onFilled: (card: Flashcard) => void;
  onError: (message: string) => void;
}

export function FillWithAiButton({ card, disabled, onFilled, onError }: FillWithAiButtonProps) {
  const t = useTranslations('Materials.handoutPage');
  const tAi = useTranslations('Materials.handoutPage.aiWords');
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const [generated] = await generateFlashcards({ pendingWords: [card.word] });
      if (generated) onFilled(fillEmptyFields(card, generated));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      onError(/too many requests/i.test(message) ? tAi('aiBusy') : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <IconButton
      size="small"
      aria-label={t('fillWithAi')}
      onClick={() => void handleClick()}
      disabled={disabled || loading}
    >
      {loading ? <CircularProgress size={16} /> : <AutoFixHighRounded sx={{ fontSize: 18 }} />}
    </IconButton>
  );
}

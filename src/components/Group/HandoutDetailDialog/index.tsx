'use client';
import Typography from '@mui/material/Typography';
import { useLocale, useTranslations } from 'next-intl';

import { StyledDialog } from '@/components/StyledDialog';
import type { HandoutRef } from '@/types/handout';

import { formatDate } from '../dueDate';
import { useGoalLabel } from '../useGoalLabel';
import { KanaSetList } from './KanaSetList';
import { WordList } from './WordList';

interface HandoutDetailDialogProps {
  open: boolean;
  onClose: () => void;
  handout: HandoutRef | null;
}

export function HandoutDetailDialog({ open, onClose, handout }: HandoutDetailDialogProps) {
  const t = useTranslations('Group.handoutDetail');
  const locale = useLocale();
  const goal = useGoalLabel()({
    required_accuracy: handout?.requiredAccuracy ?? null,
    required_mode: handout?.requiredMode ?? null,
    kana_set: handout?.kanaSet ?? null,
  });

  const title = handout ? (handout.emoji ? `${handout.emoji} ${handout.name}` : handout.name) : '';
  const subtitle = handout
    ? handout.dueDate
      ? t('dueOn', { date: formatDate(handout.dueDate, locale) })
      : t('noDueDate')
    : undefined;

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      maxWidth="sm"
      titleId="handout-detail-title"
    >
      {handout && (
        <>
          {goal && (
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'text.primary', mb: 1 }}>
              {t('goal', { goal })}
            </Typography>
          )}
          {handout.availableOn && (
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 1 }}>
              {t('availableFrom', { date: formatDate(handout.availableOn, locale) })}
            </Typography>
          )}
          {handout.note && (
            <Typography sx={{ fontSize: '0.85rem', color: 'text.primary', mb: 1.5 }}>
              {t('noteLine', { note: handout.note })}
            </Typography>
          )}
          {handout.deckId ? (
            <WordList deckId={handout.deckId} />
          ) : handout.kanaSet ? (
            <KanaSetList kanaSet={handout.kanaSet} />
          ) : null}
        </>
      )}
    </StyledDialog>
  );
}

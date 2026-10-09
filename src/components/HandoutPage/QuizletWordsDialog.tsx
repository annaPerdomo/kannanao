'use client';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { StyledDialog } from '@/components/StyledDialog';
import { keptCards, loadQuizletQueue, type QuizletImportSet } from '@/lib/quizlet';

interface QuizletWordsDialogProps {
  open: boolean;
  onClose: () => void;
  groupId: string;
  onPick: (set: QuizletImportSet) => void;
}

const TITLE_ID = 'quizlet-words-dialog-title';

export function QuizletWordsDialog({ open, onClose, groupId, onPick }: QuizletWordsDialogProps) {
  const t = useTranslations('Materials.handoutPage.quizletWords');
  const tCount = useTranslations('Materials.quizlet');
  const [sets, setSets] = useState<QuizletImportSet[]>([]);

  useEffect(() => {
    if (open) setSets(loadQuizletQueue());
  }, [open]);

  return (
    <StyledDialog open={open} onClose={onClose} title={t('title')} titleId={TITLE_ID} maxWidth="sm">
      {sets.length === 0 ? (
        <Stack spacing={1} sx={{ py: 1 }}>
          <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
            {t('empty')}
          </Typography>
          <Link component={NextLink} href={`/group/${groupId}/add/quizlet`}>
            {t('setup')}
          </Link>
        </Stack>
      ) : (
        <List disablePadding>
          {sets.map((set) => {
            const kept = keptCards(set);
            return (
              <ListItemButton
                key={set.url}
                onClick={() => onPick(set)}
                disabled={kept.length === 0}
                sx={{ borderRadius: 1 }}
              >
                <ListItemText primary={set.name} />
                <Chip
                  size="small"
                  label={tCount('cardCount', { kept: kept.length, total: set.cards.length })}
                />
              </ListItemButton>
            );
          })}
        </List>
      )}
    </StyledDialog>
  );
}

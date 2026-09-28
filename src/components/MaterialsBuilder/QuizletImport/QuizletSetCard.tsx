'use client';
import CloseIcon from '@mui/icons-material/Close';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import { useTranslations } from 'next-intl';
import { memo, useState } from 'react';

import { ReviewCardRow } from '@/components/ReviewCard';
import type { QuizletImportSet } from '@/hooks/useQuizletImport';
import type { QuizletDraftCard } from '@/lib/quizlet';

interface QuizletSetCardProps {
  set: QuizletImportSet;
  disabled: boolean;
  onSetChange: (url: string, patch: Partial<Omit<QuizletImportSet, 'url'>>) => void;
  onCardChange: (url: string, index: number, patch: Partial<QuizletDraftCard>) => void;
  onRemove: (url: string) => void;
}

export const QuizletSetCard = memo(function QuizletSetCard({
  set,
  disabled,
  onSetChange,
  onCardChange,
  onRemove,
}: QuizletSetCardProps) {
  const t = useTranslations('Materials.quizlet');
  const theme = useTheme();
  const { brand } = theme.palette;
  const [open, setOpen] = useState(false);
  const kept = set.cards.filter((c) => c.include).length;

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: theme.radii.lg,
        border: `1px solid ${alpha(brand[300], set.include ? 0.6 : 0.25)}`,
        bgcolor: 'background.paper',
        opacity: set.include ? 1 : 0.6,
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Checkbox
          checked={set.include}
          disabled={disabled}
          onChange={(e) => onSetChange(set.url, { include: e.target.checked })}
          slotProps={{ input: { 'aria-label': t('includeSet', { name: set.name }) } }}
        />
        <TextField
          size="small"
          fullWidth
          label={t('deckName')}
          value={set.name}
          disabled={disabled || !set.include}
          onChange={(e) => onSetChange(set.url, { name: e.target.value })}
        />
        <IconButton
          component="a"
          href={set.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('openOnQuizlet')}
        >
          <OpenInNewIcon fontSize="small" />
        </IconButton>
        <IconButton
          aria-label={t('removeSet')}
          disabled={disabled}
          onClick={() => onRemove(set.url)}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 1, pl: 6 }}>
        <Chip size="small" label={t('cardCount', { kept, total: set.cards.length })} />
        <Button
          size="small"
          onClick={() => setOpen((o) => !o)}
          endIcon={open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          aria-expanded={open}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          {open ? t('hideCards') : t('reviewCards')}
        </Button>
      </Stack>

      <Collapse in={open} unmountOnExit>
        <Stack spacing={1} sx={{ mt: 1.5 }}>
          {set.cards.map((card, index) => (
            <Box key={index} sx={{ opacity: card.include ? 1 : 0.5 }}>
              <ReviewCardRow
                value={card}
                disabled={disabled}
                onChange={(patch) => onCardChange(set.url, index, patch)}
                leading={
                  <Checkbox
                    size="small"
                    checked={card.include}
                    disabled={disabled}
                    onChange={(e) => onCardChange(set.url, index, { include: e.target.checked })}
                    slotProps={{ input: { 'aria-label': t('includeCard', { word: card.word }) } }}
                  />
                }
                chips={
                  card.cardType === 'phrase' ? <Chip size="small" label={t('phrase')} /> : undefined
                }
              />
            </Box>
          ))}
        </Stack>
      </Collapse>
    </Paper>
  );
});

'use client';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import type { DeckReuse } from '@/lib/lessonReuse';
import type { PlanCard, PlanDeck } from '@/types/lessonPlan';

interface PlanDeckCardProps {
  deck: PlanDeck;
  weekNumber: number;
  reuse: DeckReuse;
  retrying: boolean;
  onDeckChange: (deck: PlanDeck) => void;
  onRetry: () => void;
}

export function PlanDeckCard({
  deck,
  weekNumber,
  reuse,
  retrying,
  onDeckChange,
  onRetry,
}: PlanDeckCardProps) {
  const t = useTranslations('Group.lessonBuilder');
  const theme = useTheme();
  const { brand } = theme.palette;

  const updateCard = (index: number, patch: Partial<PlanCard>) => {
    const cards = deck.cards.map((c, i) => (i === index ? { ...c, ...patch } : c));
    onDeckChange({ ...deck, cards });
  };

  const removeCard = (index: number) => {
    onDeckChange({ ...deck, cards: deck.cards.filter((_, i) => i !== index) });
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: theme.radii.lg,
        border: `1px solid ${alpha(brand[300], 0.4)}`,
        bgcolor: 'background.paper',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ alignItems: { sm: 'center' }, mb: 1.5 }}
      >
        <Typography sx={{ fontWeight: 800, color: 'text.primary', whiteSpace: 'nowrap' }}>
          {t('weekHeading', { week: weekNumber })}
        </Typography>
        <TextField
          value={deck.name}
          onChange={(e) => onDeckChange({ ...deck, name: e.target.value })}
          size="small"
          fullWidth
          aria-label={t('deckNameLabel')}
        />
        <Button
          size="small"
          startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
          onClick={onRetry}
          disabled={retrying}
          sx={{ textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}
        >
          {t('retryDeckButton')}
        </Button>
      </Stack>

      {weekNumber > 1 && (
        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 1.5 }}>
          {t('retentionLine', { reused: reuse.reused, total: reuse.total })}
        </Typography>
      )}

      <Stack spacing={1.5}>
        {deck.cards.map((card, i) => (
          <Box
            // Index, not the word: keying on a value these fields edit remounts
            // the row on every keystroke and the input loses focus.
            key={i}
            sx={{
              p: 1.5,
              borderRadius: theme.radii.md,
              bgcolor: alpha(brand[100], 0.35),
            }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', mb: 1 }}>
              <TextField
                value={card.word}
                onChange={(e) => updateCard(i, { word: e.target.value })}
                size="small"
                label={t('wordLabel')}
                sx={{ flex: 1 }}
              />
              <TextField
                value={card.reading}
                onChange={(e) => updateCard(i, { reading: e.target.value })}
                size="small"
                label={t('readingLabel')}
                sx={{ flex: 1 }}
              />
              <TextField
                value={card.meaning}
                onChange={(e) => updateCard(i, { meaning: e.target.value })}
                size="small"
                label={t('meaningLabel')}
                sx={{ flex: 1.4 }}
              />
              <IconButton
                aria-label={t('removeCardLabel', { word: card.word })}
                onClick={() => removeCard(i)}
                size="small"
                sx={{ mt: 0.5 }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <TextField
                value={card.exampleJp}
                onChange={(e) => updateCard(i, { exampleJp: e.target.value })}
                size="small"
                label={t('exampleJpLabel')}
                fullWidth
              />
              <TextField
                value={card.exampleEn}
                onChange={(e) => updateCard(i, { exampleEn: e.target.value })}
                size="small"
                label={t('exampleEnLabel')}
                fullWidth
              />
            </Stack>

            {reuse.perCard[i]?.length > 0 && (
              <Chip
                size="small"
                label={t('buildsOnLabel', { words: reuse.perCard[i].join('、') })}
                sx={{
                  mt: 1,
                  bgcolor: alpha(brand[200], 0.5),
                  color: 'text.primary',
                  fontWeight: 600,
                }}
              />
            )}
          </Box>
        ))}
      </Stack>
    </Paper>
  );
}

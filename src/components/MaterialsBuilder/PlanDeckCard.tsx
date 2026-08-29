'use client';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useFormatter, useTranslations } from 'next-intl';

import { emptyPlanCard } from '@/lib/lessonPlanEdits';
import type { JlptLevel } from '@/lib/lessonPrompts';
import type { DeckReuse } from '@/lib/lessonReuse';
import type { PlanCard, PlanDeck } from '@/types/lessonPlan';

import { PlanCardRow } from './PlanCardRow';

interface PlanDeckCardProps {
  deck: PlanDeck;
  /** Post-exclusion week number; null when this deck is being skipped. */
  weekNumber: number | null;
  dueDate: string | null;
  reuse: DeckReuse;
  targetLevel: JlptLevel;
  retrying: boolean;
  onDeckChange: (deck: PlanDeck) => void;
  onRetry: () => void;
}

export function PlanDeckCard({
  deck,
  weekNumber,
  dueDate,
  reuse,
  targetLevel,
  retrying,
  onDeckChange,
  onRetry,
}: PlanDeckCardProps) {
  const t = useTranslations('Group.lessonBuilder');
  const theme = useTheme();
  const format = useFormatter();
  const { brand } = theme.palette;

  const deckOn = !deck.excluded;
  const noCardsLeft = deckOn && weekNumber === null;

  const updateCard = (index: number, patch: Partial<PlanCard>) => {
    const cards = deck.cards.map((c, i) => (i === index ? { ...c, ...patch } : c));
    onDeckChange({ ...deck, cards });
  };

  const dueLabel =
    weekNumber !== null && dueDate !== null
      ? t('dueChip', {
          date: format.dateTime(new Date(`${dueDate}T00:00:00Z`), {
            month: 'short',
            day: 'numeric',
            timeZone: 'UTC',
          }),
        })
      : null;

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: theme.radii.lg,
        border: `1px solid ${alpha(brand[300], 0.4)}`,
        bgcolor: 'background.paper',
        opacity: deckOn ? 1 : 0.6,
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ alignItems: { sm: 'center' } }}
      >
        <Switch
          checked={deckOn}
          onChange={(e) => onDeckChange({ ...deck, excluded: !e.target.checked })}
          slotProps={{ input: { 'aria-label': t('includeWeekLabel', { name: deck.name }) } }}
        />
        <Typography sx={{ fontWeight: 800, color: 'text.primary', whiteSpace: 'nowrap' }}>
          {weekNumber !== null ? t('weekHeading', { week: weekNumber }) : t('skippedHeading')}
        </Typography>
        <TextField
          value={deck.name}
          onChange={(e) => onDeckChange({ ...deck, name: e.target.value })}
          size="small"
          fullWidth
          disabled={!deckOn}
          aria-label={t('deckNameLabel')}
        />
        {dueLabel && (
          <Chip
            size="small"
            label={dueLabel}
            sx={{ bgcolor: alpha(brand[200], 0.5), color: 'text.primary', fontWeight: 700 }}
          />
        )}
        <Button
          size="small"
          startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
          onClick={onRetry}
          disabled={retrying || !deckOn}
          sx={{ textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}
        >
          {t('retryDeckButton')}
        </Button>
      </Stack>

      {!deckOn && (
        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mt: 1 }}>
          {t('weekSkippedNote')}
        </Typography>
      )}
      {noCardsLeft && (
        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mt: 1, fontWeight: 600 }}>
          {t('noCardsNote')}
        </Typography>
      )}

      <Collapse in={deckOn}>
        {weekNumber !== null && weekNumber > 1 && (
          <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mt: 1.5 }}>
            {t('retentionLine', { reused: reuse.reused, total: reuse.total })}
          </Typography>
        )}

        <Stack spacing={1.5} sx={{ mt: 1.5 }}>
          {deck.cards.map((card, i) => (
            <PlanCardRow
              // Index, not the word: keying on a value these fields edit remounts
              // the row on every keystroke and the input loses focus.
              key={i}
              card={card}
              index={i}
              reuseWords={reuse.perCard[i] ?? []}
              targetLevel={targetLevel}
              onChange={(patch) => updateCard(i, patch)}
            />
          ))}
        </Stack>

        <Button
          size="small"
          startIcon={<AddIcon sx={{ fontSize: 16 }} />}
          onClick={() => onDeckChange({ ...deck, cards: [...deck.cards, emptyPlanCard()] })}
          sx={{ textTransform: 'none', fontWeight: 700, mt: 1.5 }}
        >
          {t('addCardButton')}
        </Button>
      </Collapse>
    </Paper>
  );
}

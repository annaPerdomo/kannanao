'use client';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { planToReview, ReviewCardRow, reviewPatchToPlan } from '@/components/ReviewCard';
import type { KanaGap } from '@/lib/kanaGaps';
import { emptyPlanCard, includedCards } from '@/lib/lessonPlanEdits';
import { CARDS_MAX, type JlptLevel } from '@/lib/lessonPrompts';
import type { DeckReuse } from '@/lib/lessonReuse';
import type { PlanCard, PlanDeck } from '@/types/lessonPlan';

import { PlanCardChips } from './PlanCardChips';

interface PlanDeckCardProps {
  deck: PlanDeck;
  /** Post-exclusion week number; null when this deck is being skipped. */
  weekNumber: number | null;
  dueDate: string | null;
  reuse: DeckReuse;
  kanaGaps: KanaGap[][];
  targetLevel: JlptLevel;
  /** After a failed apply the ticks freeze so a retry matches what was created. */
  ticksLocked: boolean;
  retrying: boolean;
  onDeckChange: (deck: PlanDeck) => void;
  onRetry: () => void;
  /** Keep the approved cards and generate fresh ones for the rest, up to targetCount. */
  onRegenerateUnapproved: (targetCount: number) => void;
  /** This week's kana rows. */
  sounds?: React.ReactNode;
}

export function PlanDeckCard({
  deck,
  weekNumber,
  dueDate,
  reuse,
  kanaGaps,
  targetLevel,
  ticksLocked,
  retrying,
  onDeckChange,
  onRetry,
  onRegenerateUnapproved,
  sounds,
}: PlanDeckCardProps) {
  const t = useTranslations('Group.lessonBuilder');
  const theme = useTheme();
  const format = useFormatter();
  const { brand } = theme.palette;

  const deckOn = !deck.excluded;
  const noCardsLeft = deckOn && weekNumber === null;
  const approvedCount = includedCards(deck).length;

  // Resyncs when "Try again" or a regenerate changes the deck's card count.
  const [targetCount, setTargetCount] = useState(deck.cards.length);
  useEffect(() => setTargetCount(deck.cards.length), [deck.cards.length]);

  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const updateCard = (index: number, patch: Partial<PlanCard>) => {
    const cards = deck.cards.map((c, i) => (i === index ? { ...c, ...patch } : c));
    onDeckChange({ ...deck, cards });
  };

  const addCard = () => {
    setExpandedIndex(deck.cards.length);
    onDeckChange({ ...deck, cards: [...deck.cards, emptyPlanCard()] });
  };

  // Retry/regenerate replace deck.cards outright; a stale index would expand
  // an unrelated row instead of leaving the fresh set collapsed.
  const handleRetry = () => {
    setExpandedIndex(null);
    onRetry();
  };

  const handleRegenerateUnapproved = (targetCount: number) => {
    setExpandedIndex(null);
    onRegenerateUnapproved(targetCount);
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
          disabled={ticksLocked}
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
          onClick={handleRetry}
          disabled={retrying || !deckOn || ticksLocked}
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

      {deckOn && sounds}

      <Collapse in={deckOn}>
        {weekNumber !== null && weekNumber > 1 && (
          <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mt: 1.5 }}>
            {t('retentionLine', { reused: reuse.reused, total: reuse.total })}
          </Typography>
        )}

        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mt: 1.5 }}>
          {t('approveHint')}
        </Typography>

        <Stack spacing={1.5} sx={{ mt: 1.5 }}>
          {deck.cards.map((card, i) => {
            const included = !card.excluded;
            return (
              // Index, not the word: keying on a value these fields edit remounts
              // the row on every keystroke and the input loses focus.
              <Box
                key={i}
                sx={
                  included
                    ? undefined
                    : {
                        opacity: 0.55,
                        border: `1px dashed ${alpha(brand[300], 0.6)}`,
                        borderRadius: theme.radii.md,
                      }
                }
              >
                <ReviewCardRow
                  value={planToReview(card)}
                  onChange={(patch) => updateCard(i, reviewPatchToPlan(patch))}
                  disabled={!deckOn || !included}
                  expanded={i === expandedIndex ? true : undefined}
                  onExpandedChange={(open) => {
                    if (!open) setExpandedIndex(null);
                  }}
                  leading={
                    <Checkbox
                      checked={included}
                      disabled={ticksLocked}
                      onChange={(e) => updateCard(i, { excluded: !e.target.checked })}
                      slotProps={{
                        input: {
                          'aria-label': t('includeCardLabel', {
                            word: card.word.trim() || `#${i + 1}`,
                          }),
                        },
                      }}
                    />
                  }
                  chips={
                    <PlanCardChips
                      card={card}
                      included={included}
                      reuseSources={reuse.perCard[i] ?? []}
                      kanaGaps={kanaGaps[i] ?? []}
                      targetLevel={targetLevel}
                    />
                  }
                />
                {!included && (
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', display: 'block', px: 1.5, pb: 1 }}
                  >
                    {t('cardSkippedNote')}
                  </Typography>
                )}
              </Box>
            );
          })}
        </Stack>

        <Button
          size="small"
          startIcon={<AddIcon sx={{ fontSize: 16 }} />}
          onClick={addCard}
          disabled={ticksLocked}
          sx={{ textTransform: 'none', fontWeight: 700, mt: 1.5 }}
        >
          {t('addCardButton')}
        </Button>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{
            mt: 2,
            pt: 2,
            borderTop: `1px dashed ${alpha(brand[300], 0.5)}`,
            alignItems: { sm: 'center' },
          }}
        >
          <TextField
            type="number"
            size="small"
            label={t('targetCountLabel')}
            value={targetCount}
            onChange={(e) =>
              setTargetCount(
                Math.min(CARDS_MAX, Math.max(approvedCount, Number(e.target.value) || 0)),
              )
            }
            disabled={ticksLocked}
            slotProps={{ htmlInput: { min: approvedCount, max: CARDS_MAX } }}
            sx={{ maxWidth: 160 }}
          />
          <Button
            size="small"
            startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
            onClick={() => handleRegenerateUnapproved(targetCount)}
            disabled={retrying || ticksLocked}
            sx={{ textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}
          >
            {t('regenerateUnapprovedButton')}
          </Button>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            {t('regenerateHint', { approved: approvedCount, target: targetCount })}
          </Typography>
        </Stack>
      </Collapse>
    </Paper>
  );
}

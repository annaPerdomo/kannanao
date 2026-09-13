'use client';

import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ReplayIcon from '@mui/icons-material/Replay';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import { alpha, useTheme } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import type { ReviewCardValue } from '@/components/ReviewCard';
import { pendingToReview, ReviewCardRow, reviewPatchToPending } from '@/components/ReviewCard';
import type { JlptLevel } from '@/types/flashcard';

import { CardExtras } from './CardExtras';
import type { PendingCard } from './types';

interface CardListProps {
  cards: PendingCard[];
  expandedIndex: number | null;
  selected: Set<number>;
  allowRemove: boolean;
  showSelection: boolean;
  onUpdate: (index: number, patch: Partial<PendingCard>) => void;
  onDelete: (index: number) => void;
  onToggleSelect: (index: number) => void;
  onToggleExpand: (index: number, open: boolean) => void;
}

export function CardList({
  cards,
  expandedIndex,
  selected,
  allowRemove,
  showSelection,
  onUpdate,
  onDelete,
  onToggleSelect,
  onToggleExpand,
}: CardListProps) {
  const t = useTranslations('Deck.reviewCardsDialog.cardRow');
  const { brand, accent } = useTheme().palette;

  return (
    <DialogContent
      sx={{
        px: 2,
        pt: 2,
        pb: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {cards.length === 0 && (
        <Typography
          sx={{ textAlign: 'center', color: alpha(brand[700], 0.6), fontSize: '0.85rem', py: 4 }}
        >
          All cards have been removed.
        </Typography>
      )}
      {cards.map((card, i) => (
        <ReviewCardRow
          key={card.id ?? `row-${i}`}
          value={pendingToReview(card)}
          onChange={(patch: Partial<ReviewCardValue>) => onUpdate(i, reviewPatchToPending(patch))}
          expanded={expandedIndex === i}
          onExpandedChange={(open) => onToggleExpand(i, open)}
          leading={
            showSelection ? (
              <Checkbox
                checked={selected.has(i)}
                onChange={() => onToggleSelect(i)}
                size="small"
                inputProps={{ 'aria-label': t('selectCardAria', { word: card.word }) }}
                sx={{
                  p: 0.25,
                  color: alpha(brand[400], 0.7),
                  '&.Mui-checked': { color: brand[600] },
                }}
              />
            ) : undefined
          }
          chips={
            card.reusedFrom !== undefined ? (
              <Tooltip title={t('reusedTooltip')}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.3,
                    px: 0.75,
                    py: 0.2,
                    borderRadius: '6px',
                    bgcolor: alpha(accent[100], 0.7),
                    border: `1px solid ${alpha(accent[300], 0.5)}`,
                  }}
                >
                  <ReplayIcon sx={{ fontSize: 11, color: 'text.primary' }} />
                  <Typography
                    sx={{ fontSize: '0.58rem', fontWeight: 800, color: 'text.primary' }}
                    noWrap
                  >
                    {card.reusedFrom ? t('reusedFromDeck', { deck: card.reusedFrom }) : t('reused')}
                  </Typography>
                </Box>
              </Tooltip>
            ) : undefined
          }
          actions={
            allowRemove ? (
              <Tooltip title={t('removeCardTooltip')}>
                <IconButton
                  size="small"
                  aria-label={t('removeCardTooltip')}
                  onClick={() => onDelete(i)}
                  sx={{
                    width: 24,
                    height: 24,
                    color: 'rgba(248,113,113,0.5)',
                    '&:hover': { color: '#F87171', bgcolor: 'rgba(248,113,113,0.08)' },
                  }}
                >
                  <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            ) : undefined
          }
          extras={
            <CardExtras
              mainViewMode={card.mainViewMode}
              cardType={card.cardType ?? 'word'}
              jlptLevel={card.jlptLevel as JlptLevel | undefined}
              onChange={(patch) => onUpdate(i, patch)}
            />
          }
        />
      ))}
    </DialogContent>
  );
}

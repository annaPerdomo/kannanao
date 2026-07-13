'use client';

import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { StyledDialog } from '@/components/StyledDialog';
import { loadAllCards } from '@/lib/supabase';
import type { Flashcard } from '@/types/flashcard';

interface Props {
  open: boolean;
  onClose: () => void;
  targetDeckId: string;
  userId: string;
  onConfirm: (cards: Flashcard[]) => Promise<void>;
}

function CardThumbnail({ card }: { card: Flashcard }) {
  const { brand } = useTheme().palette;
  return card.imageUrl ? (
    <Box
      component="img"
      src={card.imageUrl}
      alt={card.word}
      sx={{
        width: 44,
        height: 44,
        borderRadius: '8px',
        objectFit: 'cover',
        flexShrink: 0,
        border: `1px solid ${alpha(brand[300], 0.3)}`,
        bgcolor: brand[50],
      }}
    />
  ) : (
    <Box
      sx={{
        width: 44,
        height: 44,
        borderRadius: '8px',
        flexShrink: 0,
        background: `linear-gradient(135deg, ${brand[50]} 0%, ${alpha(brand[100], 0.5)} 100%)`,
        border: `1px solid ${alpha(brand[300], 0.3)}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.1rem',
      }}
    >
      🌸
    </Box>
  );
}

export function AddExistingCardsDialog({ open, onClose, targetDeckId, userId, onConfirm }: Props) {
  const t = useTranslations('Deck.addExistingCardsDialog');
  const tCommon = useTranslations('Common');
  const { palette } = useTheme();
  const { brand } = palette;

  const [allCards, setAllCards] = useState<Flashcard[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelected(new Set());
    setSearch('');
    loadAllCards().then((cards) => {
      setAllCards(cards.filter((c) => c.deckId !== targetDeckId));
      setLoading(false);
    });
  }, [open, targetDeckId, userId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allCards;
    return allCards.filter(
      (c) =>
        c.word.toLowerCase().includes(q) ||
        c.reading.toLowerCase().includes(q) ||
        c.meaning.toLowerCase().includes(q),
    );
  }, [allCards, search]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map((c) => c.id)));
  };

  const handleConfirm = async () => {
    const chosenCards = allCards.filter((c) => selected.has(c.id));
    if (chosenCards.length === 0) return;
    setSaving(true);
    await onConfirm(chosenCards);
    setSaving(false);
    onClose();
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      title={t('title')}
      subtitle={t('subtitle')}
      icon={<LibraryAddIcon sx={{ color: brand[700], fontSize: 22 }} />}
      maxWidth="sm"
      paperSx={{ maxHeight: '80vh' }}
      actions={
        <>
          <Button onClick={onClose} sx={{ color: 'text.secondary', textTransform: 'none' }}>
            {tCommon('cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selected.size === 0 || saving}
            variant="contained"
            sx={{
              bgcolor: brand[700],
              color: brand[50],
              textTransform: 'none',
              borderRadius: 6,
              px: 2.5,
              '&:hover': { bgcolor: brand[800] },
              '&:disabled': { bgcolor: alpha(brand[700], 0.2), color: alpha(brand[50], 0.5) },
            }}
          >
            {saving ? <CircularProgress size={16} sx={{ color: brand[50], mr: 1 }} /> : null}
            {saving ? t('copying') : t('copyButton', { count: selected.size })}
          </Button>
        </>
      }
    >
      <TextField
        placeholder={t('searchPlaceholder')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        fullWidth
        size="small"
        sx={{ mb: 1.5 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
              </InputAdornment>
            ),
          },
        }}
      />

      {!loading && filtered.length > 0 && (
        <Box
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}
        >
          <Typography variant="caption" color="text.secondary">
            {selected.size > 0
              ? t('selectedCount', { count: selected.size })
              : t('cardCount', { count: filtered.length })}
          </Typography>
          <Button
            size="small"
            onClick={toggleAll}
            sx={{
              textTransform: 'none',
              fontSize: '0.75rem',
              color: brand[700],
              p: 0,
              minWidth: 0,
            }}
          >
            {allFilteredSelected ? t('deselectAll') : t('selectAll')}
          </Button>
        </Box>
      )}

      <Divider sx={{ mb: 1, borderColor: alpha(brand[300], 0.3) }} />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} sx={{ color: brand[700] }} />
        </Box>
      ) : filtered.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          {allCards.length === 0 ? t('emptyNoCards') : t('emptyNoMatch')}
        </Typography>
      ) : (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
            overflowY: 'auto',
            maxHeight: 'calc(80vh - 220px)',
            pr: 0.5,
          }}
        >
          {filtered.map((card) => {
            const isChecked = selected.has(card.id);
            return (
              <Box
                key={card.id}
                onClick={() => toggle(card.id)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  px: 1.25,
                  py: 0.875,
                  borderRadius: 3,
                  cursor: 'pointer',
                  border: `1.5px solid ${isChecked ? alpha(brand[700], 0.35) : alpha(brand[300], 0.3)}`,
                  bgcolor: isChecked ? alpha(brand[700], 0.06) : alpha('#fff', 0.6),
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    bgcolor: isChecked ? alpha(brand[700], 0.1) : alpha(brand[200], 0.12),
                    borderColor: alpha(brand[700], 0.25),
                  },
                }}
              >
                <Checkbox
                  checked={isChecked}
                  size="small"
                  disableRipple
                  sx={{
                    p: 0,
                    color: alpha(brand[700], 0.35),
                    '&.Mui-checked': { color: brand[700] },
                  }}
                />
                <CardThumbnail card={card} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
                    <Typography
                      sx={{
                        fontFamily: (t) => t.fonts.display,
                        fontSize: '1rem',
                        lineHeight: 1.3,
                        color: 'text.primary',
                      }}
                    >
                      {card.word}
                    </Typography>
                    {card.reading && (
                      <Typography
                        variant="caption"
                        sx={{ color: 'text.secondary', fontSize: '0.75rem' }}
                      >
                        {card.reading}
                      </Typography>
                    )}
                  </Box>
                  {card.meaning && (
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'text.secondary',
                        fontSize: '0.78rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {card.meaning}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </StyledDialog>
  );
}

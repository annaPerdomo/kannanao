'use client';

import AddIcon from '@mui/icons-material/Add';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import {
  alpha,
  Box,
  Button,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { stripFurigana } from '@/components/FuriganaText';
import { Loading } from '@/components/Loading';
import { StyledDialog } from '@/components/StyledDialog';
import { useAuth } from '@/contexts/AuthContext';
import { dbCreateDeck, dbInsertCards, loadDecks } from '@/lib/supabase';
import type { Deck } from '@/types/deck';

interface SaveToDeckDialogProps {
  open: boolean;
  onClose: () => void;
  phrases: Array<{ japanese: string; romaji: string; english: string }>;
  onSaved: () => void;
  defaultDeckName?: string;
}

export function SaveToDeckDialog({
  open,
  onClose,
  phrases,
  onSaved,
  defaultDeckName,
}: SaveToDeckDialogProps) {
  const t = useTranslations('Travel.saveToDeck');
  const tc = useTranslations('Common');
  const theme = useTheme();
  const { brand } = theme.palette;
  const { user } = useAuth();
  const resolvedDefaultDeckName = defaultDeckName ?? t('defaultDeckName');

  const [mode, setMode] = useState<'choose' | 'new'>('choose');
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loadingDecks, setLoadingDecks] = useState(false);
  const [newName, setNewName] = useState(resolvedDefaultDeckName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    setMode('choose');
    setNewName(resolvedDefaultDeckName);
    setError(null);
    setSaving(false);
    setLoadingDecks(true);
    loadDecks(user.id).then((loaded) => {
      setDecks(loaded);
      setLoadingDecks(false);
    });
  }, [open, user, resolvedDefaultDeckName]);

  const insertCards = useCallback(
    async (deckId: string) => {
      const cards = phrases.map((p) => ({
        word: stripFurigana(p.japanese),
        reading: p.romaji,
        meaning: p.english,
        image_query: '',
        example_jp: '',
        example_en: '',
        deckId,
        mainViewMode: 'romaji' as const,
        cardType: 'phrase' as const,
      }));
      await dbInsertCards(deckId, cards);
    },
    [phrases],
  );

  const handleAddToExisting = useCallback(
    async (deck: Deck) => {
      setSaving(true);
      setError(null);
      try {
        await insertCards(deck.id);
        onSaved();
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : t('failedToSave'));
      } finally {
        setSaving(false);
      }
    },
    [insertCards, onSaved, onClose, t],
  );

  const handleCreateNew = useCallback(async () => {
    if (!newName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const deck = await dbCreateDeck(newName.trim(), t('createdFromTravelMode'));
      await insertCards(deck.id);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failedToCreateDeck'));
    } finally {
      setSaving(false);
    }
  }, [newName, insertCards, onSaved, onClose, t]);

  const actions =
    mode === 'new' ? (
      <Stack direction="row" spacing={1}>
        <Button onClick={() => setMode('choose')} sx={{ textTransform: 'none' }}>
          {tc('back')}
        </Button>
        <Button
          onClick={handleCreateNew}
          variant="contained"
          disabled={!newName.trim() || saving}
          sx={{ textTransform: 'none', borderRadius: 2 }}
        >
          {saving ? t('saving') : t('createAndSave')}
        </Button>
      </Stack>
    ) : undefined;

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      title={t('title', { count: phrases.length })}
      subtitle={t('subtitle')}
      icon={<LibraryAddIcon sx={{ fontSize: 22, color: brand[600] }} />}
      actions={actions}
      titleId="save-to-deck-title"
    >
      {error && (
        <Typography variant="body2" sx={{ color: 'error.main', mb: 1.5 }}>
          {error}
        </Typography>
      )}

      {mode === 'choose' && (
        <Stack spacing={1.5}>
          <Button
            startIcon={<AddIcon />}
            onClick={() => setMode('new')}
            variant="outlined"
            fullWidth
            sx={{
              textTransform: 'none',
              borderRadius: 2,
              justifyContent: 'flex-start',
              borderStyle: 'dashed',
              py: 1.25,
            }}
          >
            {t('createNewDeck')}
          </Button>

          {loadingDecks ? (
            <Loading message={t('loadingDecks')} />
          ) : decks.length > 0 ? (
            <Box>
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}
              >
                {t('orAddToExisting')}
              </Typography>
              <List
                dense
                sx={{
                  maxHeight: 220,
                  overflow: 'auto',
                  border: `1px solid ${alpha(brand[300], 0.3)}`,
                  borderRadius: 2,
                }}
              >
                {decks.map((deck) => (
                  <ListItemButton
                    key={deck.id}
                    onClick={() => handleAddToExisting(deck)}
                    disabled={saving}
                    sx={{ borderRadius: 1.5 }}
                  >
                    <ListItemText
                      primary={`${deck.emoji || '📚'} ${deck.name}`}
                      secondary={t('cardsCount', { count: deck.cardCount })}
                      primaryTypographyProps={{ fontWeight: 600, fontSize: '0.85rem' }}
                      secondaryTypographyProps={{ fontSize: '0.7rem' }}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Box>
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
              {t('noExistingDecks')}
            </Typography>
          )}
        </Stack>
      )}

      {mode === 'new' && (
        <Stack spacing={2}>
          <TextField
            label={t('deckNameLabel')}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            fullWidth
            size="small"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateNew();
            }}
          />
        </Stack>
      )}
    </StyledDialog>
  );
}

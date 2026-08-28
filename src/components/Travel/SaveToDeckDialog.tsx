'use client';

import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import {
  Alert,
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
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { Loading } from '@/components/Loading';
import { StyledDialog } from '@/components/StyledDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useTravelDisplay } from '@/contexts/TravelDisplayContext';
import { errorMessage } from '@/lib/errorMessage';
import { dbCreateDeck, dbInsertCards, loadDecks } from '@/lib/supabase';
import { buildTravelCards, type TravelPhrase } from '@/services/cardPipeline';
import type { Deck } from '@/types/deck';

interface SaveToDeckDialogProps {
  open: boolean;
  onClose: () => void;
  phrases: TravelPhrase[];
  onSaved: () => void;
  defaultDeckName?: string;
}

/**
 * Saving a travel phrase runs the full card pipeline (readings, example
 * sentences, a photo per card), which takes seconds rather than milliseconds.
 * The step is explicit in the UI: pick a deck, watch it build, then land on a
 * confirmation with a way into the deck — not a dialog that sits there looking
 * idle and then vanishes.
 */
type Step = 'choose' | 'new' | 'saving' | 'done';

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
  const { user, isMemberAccount } = useAuth();
  const { mode: displayMode } = useTravelDisplay();
  const router = useRouter();
  const resolvedDefaultDeckName = defaultDeckName ?? t('defaultDeckName');

  const [step, setStep] = useState<Step>('choose');
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loadingDecks, setLoadingDecks] = useState(false);
  const [newName, setNewName] = useState(resolvedDefaultDeckName);
  const [savedDeck, setSavedDeck] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    setStep('choose');
    setNewName(resolvedDefaultDeckName);
    setError(null);
    setSavedDeck(null);
    setLoadingDecks(true);
    loadDecks(user.id)
      .then((loaded) => setDecks(loaded))
      .catch(() => setError(t('loadDecksError')))
      .finally(() => setLoadingDecks(false));
  }, [open, user, resolvedDefaultDeckName, t]);

  const insertCards = useCallback(
    async (deckId: string) => {
      // Same generation + imagery as typing the phrase into the card generator,
      // so a travel card isn't a second-class card. Member accounts have no
      // access to the paid routes, so they get the local build instead.
      const cards = await buildTravelCards(phrases, deckId, {
        mainViewMode: displayMode,
        enrich: !isMemberAccount,
      });
      await dbInsertCards(deckId, cards);
    },
    [phrases, displayMode, isMemberAccount],
  );

  const handleAddToExisting = useCallback(
    async (deck: Deck) => {
      setStep('saving');
      setError(null);
      try {
        await insertCards(deck.id);
        setSavedDeck({ id: deck.id, name: deck.name });
        setStep('done');
        onSaved();
      } catch (err) {
        setError(errorMessage(err, t('failedToSave')));
        setStep('choose');
      }
    },
    [insertCards, onSaved, t],
  );

  const handleCreateNew = useCallback(async () => {
    if (!newName.trim()) return;
    const name = newName.trim();
    setStep('saving');
    setError(null);
    try {
      const deck = await dbCreateDeck(name, t('createdFromTravelMode'));
      await insertCards(deck.id);
      setSavedDeck({ id: deck.id, name });
      setStep('done');
      onSaved();
    } catch (err) {
      setError(errorMessage(err, t('failedToCreateDeck')));
      setStep('new');
    }
  }, [newName, insertCards, onSaved, t]);

  const handleGoToDeck = useCallback(() => {
    if (!savedDeck) return;
    onClose();
    router.push(`/deck/${savedDeck.id}`);
  }, [savedDeck, onClose, router]);

  const actions =
    step === 'new' ? (
      <Stack direction="row" spacing={1}>
        <Button onClick={() => setStep('choose')} sx={{ textTransform: 'none' }}>
          {tc('back')}
        </Button>
        <Button
          onClick={handleCreateNew}
          variant="contained"
          disabled={!newName.trim()}
          sx={{ textTransform: 'none', borderRadius: 2 }}
        >
          {t('createAndSave')}
        </Button>
      </Stack>
    ) : step === 'done' ? (
      <Stack direction="row" spacing={1}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>
          {t('keepBrowsing')}
        </Button>
        <Button
          onClick={handleGoToDeck}
          variant="contained"
          sx={{ textTransform: 'none', borderRadius: 2 }}
        >
          {t('goToDeck')}
        </Button>
      </Stack>
    ) : undefined;

  return (
    <StyledDialog
      open={open}
      onClose={step === 'saving' ? () => {} : onClose}
      closeDisabled={step === 'saving'}
      title={step === 'done' ? t('savedTitle') : t('title', { count: phrases.length })}
      subtitle={step === 'done' ? undefined : t('subtitle')}
      icon={<LibraryAddIcon sx={{ fontSize: 22, color: brand[600] }} />}
      actions={actions}
      titleId="save-to-deck-title"
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2, fontSize: '0.8rem', borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* One message, not two — the mascot and the message together already say
          "this is working, give it a moment". */}
      {step === 'saving' && (
        <Box sx={{ py: 2 }}>
          <Loading message={t('savingTitle', { count: phrases.length })} />
        </Box>
      )}

      {step === 'done' && savedDeck && (
        <Stack spacing={1.5} sx={{ alignItems: 'center', py: 1.5, textAlign: 'center' }}>
          <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main' }} />
          <Typography variant="body1" sx={{ fontWeight: 700 }}>
            {t('savedBody', { count: phrases.length, deck: savedDeck.name })}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('savedHint')}
          </Typography>
        </Stack>
      )}

      {step === 'choose' && (
        <Stack spacing={1.5}>
          <Button
            startIcon={<AddIcon />}
            onClick={() => setStep('new')}
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

      {step === 'new' && (
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

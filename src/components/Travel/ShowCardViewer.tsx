'use client';

import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import {
  Alert,
  alpha,
  Box,
  Button,
  Card,
  Chip,
  Container,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { stripFurigana } from '@/components/FuriganaText';
import { Loading } from '@/components/Loading';
import { useTravelDisplay } from '@/contexts/TravelDisplayContext';
import { useSpeech } from '@/hooks/useSpeech';
import { useShowCards } from '@/hooks/useTravel';
import { logTravelEvent } from '@/lib/supabase';
import type { ShowCard, ShowCardCategory } from '@/types/travel';

import { SaveToDeckDialog } from './SaveToDeckDialog';

const CATEGORIES: Array<{ key: ShowCardCategory | 'all'; label: string; icon: string }> = [
  { key: 'all', label: 'All', icon: '📋' },
  { key: 'allergies', label: 'Allergies', icon: '⚠️' },
  { key: 'directions', label: 'Directions', icon: '🗺️' },
  { key: 'help', label: 'Help', icon: '🙏' },
  { key: 'medical', label: 'Medical', icon: '🏥' },
  { key: 'communication', label: 'Communication', icon: '💬' },
  { key: 'preferences', label: 'Preferences', icon: '👍' },
  { key: 'custom', label: 'Custom', icon: '✨' },
];

interface ShowCardDisplayProps {
  card: ShowCard;
  expanded: boolean;
  onDelete?: () => void;
  onEdit?: (
    patch: Partial<Pick<ShowCard, 'english' | 'japanese' | 'romaji' | 'situation'>>,
  ) => void;
}

function ShowCardDisplay({ card, expanded, onDelete, onEdit }: ShowCardDisplayProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const { speak } = useSpeech();
  const { mode: displayMode } = useTravelDisplay();
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ english: '', japanese: '', romaji: '', situation: '' });

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(card.japanese);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [card.japanese]);

  const startEditing = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setDraft({
        english: card.english,
        japanese: card.japanese,
        romaji: card.romaji,
        situation: card.situation,
      });
      setEditing(true);
    },
    [card],
  );

  const cancelEditing = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(false);
  }, []);

  const saveEditing = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const patch: Partial<Pick<ShowCard, 'english' | 'japanese' | 'romaji' | 'situation'>> = {};
      if (draft.english !== card.english) patch.english = draft.english;
      if (draft.japanese !== card.japanese) patch.japanese = draft.japanese;
      if (draft.romaji !== card.romaji) patch.romaji = draft.romaji;
      if (draft.situation !== card.situation) patch.situation = draft.situation;
      if (Object.keys(patch).length > 0) onEdit?.(patch);
      setEditing(false);
    },
    [draft, card, onEdit],
  );

  if (editing) {
    return (
      <Card
        sx={{
          borderRadius: 4,
          overflow: 'hidden',
          border: `2px solid ${alpha(brand[500], 0.5)}`,
          boxShadow: `0 8px 40px ${alpha(brand[400], 0.2)}`,
        }}
      >
        <Box
          sx={{
            p: 2,
            background: alpha(brand[50], 0.8),
            borderBottom: `1px solid ${alpha(brand[200], 0.5)}`,
          }}
        >
          <TextField
            fullWidth
            size="small"
            label="English"
            value={draft.english}
            onChange={(e) => setDraft((d) => ({ ...d, english: e.target.value }))}
            onClick={(e) => e.stopPropagation()}
          />
        </Box>
        <Stack spacing={1.5} sx={{ p: 2.5, background: '#fff' }}>
          <TextField
            fullWidth
            size="small"
            label="Japanese"
            value={draft.japanese}
            onChange={(e) => setDraft((d) => ({ ...d, japanese: e.target.value }))}
            onClick={(e) => e.stopPropagation()}
          />
          <TextField
            fullWidth
            size="small"
            label="Romaji"
            value={draft.romaji}
            onChange={(e) => setDraft((d) => ({ ...d, romaji: e.target.value }))}
            onClick={(e) => e.stopPropagation()}
          />
          <TextField
            fullWidth
            size="small"
            label="When to show"
            value={draft.situation}
            onChange={(e) => setDraft((d) => ({ ...d, situation: e.target.value }))}
            onClick={(e) => e.stopPropagation()}
          />
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button
              size="small"
              startIcon={<CloseIcon sx={{ fontSize: 14 }} />}
              onClick={cancelEditing}
              sx={{ textTransform: 'none', borderRadius: '20px', fontSize: '0.78rem' }}
            >
              Cancel
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<CheckIcon sx={{ fontSize: 14 }} />}
              onClick={saveEditing}
              disabled={!draft.english.trim() || !draft.japanese.trim()}
              sx={{ textTransform: 'none', borderRadius: '20px', fontSize: '0.78rem' }}
            >
              Save
            </Button>
          </Stack>
        </Stack>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        borderRadius: 4,
        overflow: 'hidden',
        border: `2px solid ${alpha(brand[400], 0.3)}`,
        transition: 'all 0.3s',
        ...(expanded && {
          boxShadow: `0 8px 40px ${alpha(brand[400], 0.2)}`,
        }),
      }}
    >
      {/* English - for the tourist */}
      <Box
        sx={{
          p: 2,
          background: alpha(brand[50], 0.8),
          borderBottom: `1px solid ${alpha(brand[200], 0.5)}`,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Typography sx={{ fontSize: '1.3rem' }}>{card.icon}</Typography>
        <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary', flex: 1 }}>
          {card.english}
        </Typography>
        {card.isCustom && (
          <>
            <Chip
              label="AI"
              size="small"
              sx={{
                height: 20,
                fontSize: '0.6rem',
                fontWeight: 700,
                bgcolor: alpha(brand[500], 0.12),
                color: brand[700],
              }}
            />
            {onEdit && (
              <Tooltip title="Edit card">
                <IconButton
                  size="small"
                  onClick={startEditing}
                  aria-label="Edit custom card"
                  sx={{ p: 0.5 }}
                >
                  <EditIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                </IconButton>
              </Tooltip>
            )}
            {onDelete && (
              <Tooltip title="Delete card">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  aria-label="Delete custom card"
                  sx={{ p: 0.5 }}
                >
                  <DeleteOutlineIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                </IconButton>
              </Tooltip>
            )}
          </>
        )}
      </Box>

      {/* Japanese - large text to show to Japanese person */}
      <Box
        sx={{
          p: 3,
          background: '#fff',
          textAlign: 'center',
        }}
      >
        <Typography
          sx={{
            fontFamily: (t) => t.fonts.jp,
            fontSize: expanded ? '2rem' : '1.5rem',
            fontWeight: 600,
            color: 'text.primary',
            lineHeight: 1.4,
            mb: 1,
          }}
        >
          {card.japanese}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <Typography
            variant="body2"
            sx={{
              color: brand[600],
              fontStyle: displayMode === 'romaji' ? 'normal' : 'italic',
              fontWeight: displayMode === 'romaji' ? 600 : 400,
              fontSize: displayMode === 'romaji' ? '1rem' : undefined,
            }}
          >
            {card.romaji}
          </Typography>
          <Tooltip title="Listen">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                speak(stripFurigana(card.japanese));
              }}
              aria-label="Listen to pronunciation"
            >
              <VolumeUpIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={copied ? 'Copied!' : 'Copy Japanese text'}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleCopy();
              }}
              aria-label="Copy Japanese text"
            >
              <ContentCopyIcon sx={{ fontSize: 14, color: copied ? '#10b981' : undefined }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Situation note */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          background: alpha(brand[100], 0.4),
          borderTop: `1px solid ${alpha(brand[200], 0.5)}`,
        }}
      >
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {card.situation}
        </Typography>
      </Box>
    </Card>
  );
}

export function ShowCardViewer() {
  const theme = useTheme();
  const { brand } = theme.palette;
  const router = useRouter();
  const { mode: displayMode } = useTravelDisplay();
  const {
    generating,
    loading: cardsLoading,
    error,
    generateCard,
    updateCard,
    deleteCard,
    filterByCategory,
  } = useShowCards();
  const [activeCategory, setActiveCategory] = useState<ShowCardCategory | 'all'>('all');
  const [customInput, setCustomInput] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [genSuccess, setGenSuccess] = useState(false);
  const [deckDialogOpen, setDeckDialogOpen] = useState(false);
  const [deckSaved, setDeckSaved] = useState(false);

  const filteredCards = filterByCategory(activeCategory);

  useEffect(() => {
    logTravelEvent('show_card', 'view');
  }, []);

  const handleGenerate = async () => {
    if (!customInput.trim()) return;
    logTravelEvent('show_card', 'generate');
    const result = await generateCard(customInput.trim(), displayMode);
    if (result) {
      setCustomInput('');
      setShowCreate(false);
      setActiveCategory('all');
      setGenSuccess(true);
      setTimeout(() => setGenSuccess(false), 3000);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, sm: 4 }, px: { xs: 2, sm: 3 } }}>
      <Stack spacing={2.5}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={() => router.push('/travel')} aria-label="Back to travel hub">
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="h5"
              sx={{
                color: 'text.primary',
              }}
            >
              Point & Communicate
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', mt: 0.25, fontSize: '0.78rem' }}
            >
              Show these cards when you can&apos;t speak
            </Typography>
          </Box>
          <Button
            startIcon={showCreate ? undefined : <AddIcon />}
            onClick={() => setShowCreate(!showCreate)}
            variant={showCreate ? 'outlined' : 'contained'}
            size="small"
            sx={{ textTransform: 'none', borderRadius: '20px', fontSize: '0.8rem' }}
          >
            {showCreate ? 'Cancel' : 'Create'}
          </Button>
        </Box>

        {/* Create custom card */}
        {showCreate && (
          <Card
            sx={{
              p: 2.5,
              borderRadius: 3,
              background: alpha(brand[50], 0.8),
              border: `1px solid ${alpha(brand[300], 0.3)}`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <AutoAwesomeIcon sx={{ color: brand[600], fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                Create with AI
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
              Type what you want to communicate in English, and AI will create the perfect card.
            </Typography>
            <Stack spacing={1.5}>
              <TextField
                fullWidth
                size="small"
                placeholder='e.g. "I am gluten free" or "Where is the bathroom?"'
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleGenerate();
                }}
                disabled={generating}
              />
              <Button
                onClick={handleGenerate}
                disabled={!customInput.trim() || generating}
                variant="contained"
                startIcon={<AutoAwesomeIcon />}
                sx={{ textTransform: 'none', borderRadius: 2 }}
              >
                {generating ? 'Creating...' : 'Generate Card'}
              </Button>
            </Stack>
          </Card>
        )}

        {generating && <Loading message="Creating your card..." />}
        {error && <Alert severity="error">{error}</Alert>}
        {genSuccess && <Alert severity="success">Card created! Find it at the top.</Alert>}

        {/* Category filter */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {CATEGORIES.map((cat) => (
            <Chip
              key={cat.key}
              label={`${cat.icon} ${cat.label}`}
              onClick={() => setActiveCategory(cat.key)}
              variant={activeCategory === cat.key ? 'filled' : 'outlined'}
              sx={{
                borderRadius: 2,
                fontWeight: activeCategory === cat.key ? 700 : 500,
                borderColor: alpha(brand[300], 0.4),
                ...(activeCategory === cat.key && {
                  bgcolor: alpha(brand[500], 0.12),
                  color: brand[700],
                  borderColor: brand[400],
                }),
              }}
            />
          ))}
        </Box>

        {/* Cards list */}
        {cardsLoading && <Loading message="Loading saved cards..." />}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            gap: 2,
          }}
        >
          {filteredCards.map((card) => (
            <Box
              key={card.id}
              onClick={() => setExpandedId(expandedId === card.id ? null : card.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setExpandedId(expandedId === card.id ? null : card.id);
                }
              }}
              sx={{ cursor: 'pointer' }}
            >
              <ShowCardDisplay
                card={card}
                expanded={expandedId === card.id}
                onEdit={card.isCustom ? (patch) => updateCard(card.id, patch) : undefined}
                onDelete={card.isCustom ? () => deleteCard(card.id) : undefined}
              />
            </Box>
          ))}
        </Box>

        {filteredCards.length === 0 && (
          <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary', py: 4 }}>
            No cards in this category yet. Create one with AI!
          </Typography>
        )}

        {filteredCards.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<LibraryAddIcon sx={{ fontSize: 16 }} />}
              onClick={() => {
                setDeckSaved(false);
                setDeckDialogOpen(true);
              }}
              disabled={deckSaved}
              sx={{ textTransform: 'none', borderRadius: 2, fontSize: '0.8rem' }}
            >
              {deckSaved ? 'Saved to deck!' : `Save ${filteredCards.length} cards to deck`}
            </Button>
          </Box>
        )}
      </Stack>

      <SaveToDeckDialog
        open={deckDialogOpen}
        onClose={() => setDeckDialogOpen(false)}
        phrases={filteredCards.map((c) => ({
          japanese: c.japanese,
          romaji: c.romaji,
          english: c.english,
        }))}
        onSaved={() => setDeckSaved(true)}
        defaultDeckName="Point & Communicate Cards"
      />
    </Container>
  );
}

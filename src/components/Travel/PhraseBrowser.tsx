'use client';

import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BookmarkAddedIcon from '@mui/icons-material/BookmarkAdded';
import SchoolIcon from '@mui/icons-material/School';
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
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useSpeech } from '@/hooks/useSpeech';
import { useSurvivalPhrases } from '@/hooks/useTravel';
import type { PhraseSituation } from '@/types/travel';

import { Loading } from '../Loading';
import { SaveToDeckDialog } from './SaveToDeckDialog';

const SITUATIONS: Array<{ key: PhraseSituation; label: string; icon: string; color: string }> = [
  { key: 'greetings', label: 'Greetings', icon: '👋', color: '#f59e0b' },
  { key: 'restaurant', label: 'Restaurant', icon: '🍜', color: '#ef4444' },
  { key: 'shopping', label: 'Shopping', icon: '🛍️', color: '#8b5cf6' },
  { key: 'transport', label: 'Transport', icon: '🚃', color: '#3b82f6' },
  { key: 'hotel', label: 'Hotel', icon: '🏨', color: '#6366f1' },
  { key: 'directions', label: 'Directions', icon: '🗺️', color: '#10b981' },
  { key: 'polite', label: 'Polite Extras', icon: '🎌', color: '#ec4899' },
  { key: 'numbers', label: 'Numbers', icon: '🔢', color: '#f97316' },
  { key: 'emergency', label: 'Emergency', icon: '🆘', color: '#dc2626' },
];

const DIFFICULTY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Easy', color: '#10b981' },
  2: { label: 'Medium', color: '#f59e0b' },
  3: { label: 'Longer', color: '#8b5cf6' },
};

const FORMALITY_LABELS: Record<string, { label: string; icon: string }> = {
  casual: { label: 'Casual', icon: '😊' },
  polite: { label: 'Polite', icon: '🙇' },
  very_polite: { label: 'Very polite', icon: '🎩' },
};

export function PhraseBrowser() {
  const theme = useTheme();
  const { brand } = theme.palette;
  const router = useRouter();
  const { speak } = useSpeech();
  const {
    phrases,
    loading,
    error,
    activeSituation,
    loadPhrases,
    reset: resetPhrases,
  } = useSurvivalPhrases();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deckDialogOpen, setDeckDialogOpen] = useState(false);
  const [deckSaved, setDeckSaved] = useState(false);

  // Situation selection
  if (!activeSituation) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <IconButton onClick={() => router.push('/travel')} aria-label="Back to travel hub">
              <ArrowBackIcon />
            </IconButton>
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, fontFamily: (t) => t.fonts.display, color: 'text.primary' }}
            >
              Survival Phrases
            </Typography>
          </Box>

          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            AI generates practical phrases you will actually need — with romaji pronunciation,
            audio, and tips on when to use each one.
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' },
              gap: 2,
            }}
          >
            {SITUATIONS.map((s) => (
              <Card
                key={s.key}
                onClick={() => loadPhrases(s.key)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    loadPhrases(s.key);
                  }
                }}
                sx={{
                  p: 2.5,
                  cursor: 'pointer',
                  borderRadius: 3,
                  textAlign: 'center',
                  border: `1px solid ${alpha(s.color, 0.2)}`,
                  background: alpha(s.color, 0.04),
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: `0 8px 24px ${alpha(s.color, 0.15)}`,
                    borderColor: alpha(s.color, 0.4),
                  },
                }}
              >
                <Typography sx={{ fontSize: '2rem', mb: 1 }}>{s.icon}</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {s.label}
                </Typography>
              </Card>
            ))}
          </Box>
        </Stack>
      </Container>
    );
  }

  const situationInfo = SITUATIONS.find((s) => s.key === activeSituation);

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={resetPhrases} aria-label="Back to situations">
            <ArrowBackIcon />
          </IconButton>
          <Typography sx={{ fontSize: '1.3rem' }}>{situationInfo?.icon}</Typography>
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, fontFamily: (t) => t.fonts.display, color: 'text.primary' }}
          >
            {situationInfo?.label} Phrases
          </Typography>
        </Box>

        {/* Save to deck button */}
        {phrases.length > 0 && !loading && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            {deckSaved ? (
              <Chip
                icon={<BookmarkAddedIcon sx={{ fontSize: '14px !important' }} />}
                label="Saved to deck!"
                sx={{
                  bgcolor: alpha('#10b981', 0.12),
                  color: '#059669',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                }}
              />
            ) : (
              <Button
                startIcon={<AddIcon />}
                onClick={() => setDeckDialogOpen(true)}
                size="small"
                variant="outlined"
                sx={{ textTransform: 'none', borderRadius: 2, fontSize: '0.75rem' }}
              >
                Save all to deck ({phrases.length} cards)
              </Button>
            )}
          </Box>
        )}

        {loading && <Loading message="Generating phrases..." />}
        {error && <Alert severity="error">{error}</Alert>}

        {/* Phrases */}
        <Stack spacing={2}>
          {phrases.map((phrase) => {
            const isExpanded = expandedId === phrase.id;
            const diff = DIFFICULTY_LABELS[phrase.difficulty] ?? DIFFICULTY_LABELS[1];
            const form = FORMALITY_LABELS[phrase.formality] ?? FORMALITY_LABELS.polite;

            return (
              <Card
                key={phrase.id}
                onClick={() => setExpandedId(isExpanded ? null : phrase.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setExpandedId(isExpanded ? null : phrase.id);
                  }
                }}
                sx={{
                  borderRadius: 3,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: `1px solid ${alpha(brand[300], 0.3)}`,
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: alpha(brand[400], 0.5),
                  },
                }}
              >
                <Box sx={{ p: 2 }}>
                  {/* Main content */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}
                      >
                        {phrase.english}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography
                          sx={{
                            fontFamily: (t) => t.fonts.jp,
                            fontSize: '1.15rem',
                            color: 'text.primary',
                          }}
                        >
                          {phrase.japanese}
                        </Typography>
                        <Tooltip title="Listen">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              speak(phrase.japanese);
                            }}
                            aria-label="Listen to pronunciation"
                          >
                            <VolumeUpIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{ color: brand[600], fontStyle: 'italic', mt: 0.25 }}
                      >
                        {phrase.romaji}
                      </Typography>
                    </Box>
                    <Stack spacing={0.5} alignItems="flex-end">
                      <Chip
                        label={diff.label}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.6rem',
                          fontWeight: 700,
                          bgcolor: alpha(diff.color, 0.12),
                          color: diff.color,
                        }}
                      />
                      <Chip
                        label={`${form.icon} ${form.label}`}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.6rem',
                          fontWeight: 600,
                          bgcolor: alpha(brand[200], 0.3),
                          color: 'text.secondary',
                        }}
                      />
                    </Stack>
                  </Box>

                  {/* Expanded content */}
                  {isExpanded && (
                    <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${alpha(brand[200], 0.4)}` }}>
                      <Stack spacing={1.5}>
                        <Box>
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: 700, color: brand[600], letterSpacing: '0.05em' }}
                          >
                            BREAKDOWN
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            {phrase.breakdown}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography
                            variant="caption"
                            sx={{ fontWeight: 700, color: brand[600], letterSpacing: '0.05em' }}
                          >
                            WHEN TO USE
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            {phrase.whenToUse}
                          </Typography>
                        </Box>
                        {phrase.culturalNote && (
                          <Box
                            sx={{
                              p: 1.5,
                              borderRadius: 2,
                              background: alpha('#f59e0b', 0.06),
                              border: `1px solid ${alpha('#f59e0b', 0.15)}`,
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                              <SchoolIcon sx={{ fontSize: 14, color: '#f59e0b' }} />
                              <Typography
                                variant="caption"
                                sx={{ fontWeight: 700, color: '#d97706', letterSpacing: '0.05em' }}
                              >
                                CULTURAL NOTE
                              </Typography>
                            </Box>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                              {phrase.culturalNote}
                            </Typography>
                          </Box>
                        )}
                      </Stack>
                    </Box>
                  )}
                </Box>
              </Card>
            );
          })}
        </Stack>
      </Stack>

      <SaveToDeckDialog
        open={deckDialogOpen}
        onClose={() => setDeckDialogOpen(false)}
        phrases={phrases.map((p) => ({
          japanese: p.japanese,
          romaji: p.romaji,
          english: p.english,
        }))}
        onSaved={() => setDeckSaved(true)}
        defaultDeckName={`${situationInfo?.icon ?? '🗾'} Travel: ${situationInfo?.label ?? 'Phrases'}`}
      />
    </Container>
  );
}

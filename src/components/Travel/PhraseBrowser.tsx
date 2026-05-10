'use client';

import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BookmarkAddedIcon from '@mui/icons-material/BookmarkAdded';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import SchoolIcon from '@mui/icons-material/School';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import {
  alpha,
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

import { stripFurigana } from '@/components/FuriganaText';
import { useSpeech } from '@/hooks/useSpeech';
import { logTravelEvent } from '@/lib/supabase';
import type { PhraseSituation } from '@/types/travel';

import { SURVIVAL_PHRASES } from '../../hooks/survivalPhrasesData';
import { AuthGatedSaveDialog } from './AuthGatedSaveDialog';
import { TravelPhrase } from './TravelPhrase';

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
  const [activeFilter, setActiveFilter] = useState<PhraseSituation | 'all'>('greetings');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [phrasesToSave, setPhrasesToSave] = useState<
    Array<{ japanese: string; romaji: string; english: string }>
  >([]);
  const [deckSaved, setDeckSaved] = useState(false);

  const handleFilter = useCallback((key: PhraseSituation | 'all') => {
    setActiveFilter(key);
    if (key !== 'all') logTravelEvent('phrases', 'browse', { situation: key });
  }, []);

  const visibleSituations = useMemo(
    () => (activeFilter === 'all' ? SITUATIONS : SITUATIONS.filter((s) => s.key === activeFilter)),
    [activeFilter],
  );

  const filteredPhrases = useMemo(
    () =>
      activeFilter === 'all'
        ? SURVIVAL_PHRASES
        : SURVIVAL_PHRASES.filter((p) => p.situation === activeFilter),
    [activeFilter],
  );

  const activeSituationInfo =
    activeFilter !== 'all' ? SITUATIONS.find((s) => s.key === activeFilter) : null;

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, sm: 4 }, px: { xs: 2, sm: 3 } }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={() => router.push('/travel')} aria-label="Back to travel hub">
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" sx={{ color: 'text.primary' }}>
              Survival Phrases
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
              Essential phrases with pronunciation and tips
            </Typography>
          </Box>
          {filteredPhrases.length > 0 &&
            (deckSaved ? (
              <Chip
                icon={<BookmarkAddedIcon sx={{ fontSize: '14px !important' }} />}
                label="Saved!"
                sx={{
                  bgcolor: alpha('#10b981', 0.12),
                  color: '#059669',
                  fontWeight: 600,
                  fontSize: '0.72rem',
                }}
              />
            ) : (
              <Button
                startIcon={<AddIcon sx={{ fontSize: 14 }} />}
                onClick={() => {
                  setDeckSaved(false);
                  setPhrasesToSave(
                    filteredPhrases.map((p) => ({
                      japanese: p.japanese,
                      romaji: p.romaji,
                      english: p.english,
                    })),
                  );
                  setSaveDialogOpen(true);
                }}
                size="small"
                variant="outlined"
                sx={{ textTransform: 'none', borderRadius: '20px', fontSize: '0.72rem' }}
              >
                Save all
              </Button>
            ))}
        </Box>

        {/* Filter chips */}
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
          <Chip
            label="All"
            onClick={() => handleFilter('all')}
            variant={activeFilter === 'all' ? 'filled' : 'outlined'}
            sx={{
              borderRadius: 2,
              fontWeight: activeFilter === 'all' ? 700 : 500,
              borderColor: alpha(brand[300], 0.4),
              ...(activeFilter === 'all' && {
                bgcolor: alpha(brand[500], 0.12),
                color: brand[700],
                borderColor: brand[400],
              }),
            }}
          />
          {SITUATIONS.map((s) => (
            <Chip
              key={s.key}
              label={`${s.icon} ${s.label}`}
              onClick={() => handleFilter(s.key)}
              variant={activeFilter === s.key ? 'filled' : 'outlined'}
              sx={{
                borderRadius: 2,
                fontWeight: activeFilter === s.key ? 700 : 500,
                borderColor: alpha(s.color, 0.3),
                ...(activeFilter === s.key && {
                  bgcolor: alpha(s.color, 0.12),
                  color: s.color,
                  borderColor: s.color,
                }),
              }}
            />
          ))}
        </Box>

        {/* Phrases grouped by situation */}
        {visibleSituations.map((situation) => {
          const phrasesInSituation = SURVIVAL_PHRASES.filter((p) => p.situation === situation.key);
          return (
            <Box key={situation.key}>
              {/* Section header (only when showing all) */}
              {activeFilter === 'all' && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <Typography sx={{ fontSize: '1.1rem', lineHeight: 1 }}>
                    {situation.icon}
                  </Typography>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      color: 'text.primary',
                    }}
                  >
                    {situation.label}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {phrasesInSituation.length} phrases
                  </Typography>
                </Box>
              )}

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                  gap: 1.5,
                }}
              >
                {phrasesInSituation.map((phrase) => {
                  const diff = DIFFICULTY_LABELS[phrase.difficulty] ?? DIFFICULTY_LABELS[1];
                  const form = FORMALITY_LABELS[phrase.formality] ?? FORMALITY_LABELS.polite;

                  return (
                    <Box
                      key={phrase.id}
                      sx={{
                        p: 2,
                        borderRadius: '14px',
                        bgcolor: 'background.paper',
                        border: `1px solid ${alpha(brand[300], 0.2)}`,
                        boxShadow: `0 1px 3px ${alpha(brand[400], 0.06)}`,
                      }}
                    >
                      {/* Main content */}
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600,
                              color: 'text.primary',
                              mb: 0.5,
                              fontSize: '0.84rem',
                            }}
                          >
                            {phrase.english}
                          </Typography>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                              flexWrap: 'wrap',
                            }}
                          >
                            <TravelPhrase
                              japanese={phrase.japanese}
                              romaji={phrase.romaji}
                              primarySize="1.05rem"
                              secondarySize="0.78rem"
                            />
                            <Tooltip title="Listen">
                              <IconButton
                                size="small"
                                onClick={() => speak(stripFurigana(phrase.japanese))}
                                aria-label="Listen to pronunciation"
                                sx={{ p: 0.5 }}
                              >
                                <VolumeUpIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Save to deck">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setPhrasesToSave([
                                    {
                                      japanese: phrase.japanese,
                                      romaji: phrase.romaji,
                                      english: phrase.english,
                                    },
                                  ]);
                                  setSaveDialogOpen(true);
                                }}
                                aria-label="Save phrase to deck"
                                sx={{ p: 0.5 }}
                              >
                                <BookmarkBorderIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                        <Stack spacing={0.5} alignItems="flex-end">
                          <Chip
                            label={diff.label}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '0.58rem',
                              fontWeight: 700,
                              bgcolor: alpha(diff.color, 0.1),
                              color: diff.color,
                              '& .MuiChip-label': { px: 0.75 },
                            }}
                          />
                          <Chip
                            label={`${form.icon} ${form.label}`}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '0.58rem',
                              fontWeight: 600,
                              bgcolor: alpha(brand[200], 0.25),
                              color: 'text.secondary',
                              '& .MuiChip-label': { px: 0.75 },
                            }}
                          />
                        </Stack>
                      </Box>

                      {/* Details */}
                      <Box
                        sx={{ mt: 1.5, pt: 1.5, borderTop: `1px solid ${alpha(brand[200], 0.3)}` }}
                      >
                        <Stack spacing={1.25}>
                          <Box>
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 700,
                                color: brand[600],
                                letterSpacing: '0.04em',
                                fontSize: '0.6rem',
                              }}
                            >
                              BREAKDOWN
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ color: 'text.secondary', fontSize: '0.8rem' }}
                            >
                              {phrase.breakdown}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 700,
                                color: brand[600],
                                letterSpacing: '0.04em',
                                fontSize: '0.6rem',
                              }}
                            >
                              WHEN TO USE
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ color: 'text.secondary', fontSize: '0.8rem' }}
                            >
                              {phrase.whenToUse}
                            </Typography>
                          </Box>
                          {phrase.culturalNote && (
                            <Box
                              sx={{
                                p: 1.5,
                                borderRadius: '10px',
                                background: alpha('#f59e0b', 0.04),
                                border: `1px solid ${alpha('#f59e0b', 0.12)}`,
                              }}
                            >
                              <Box
                                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}
                              >
                                <SchoolIcon sx={{ fontSize: 12, color: '#f59e0b' }} />
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontWeight: 700,
                                    color: '#d97706',
                                    letterSpacing: '0.04em',
                                    fontSize: '0.6rem',
                                  }}
                                >
                                  CULTURAL NOTE
                                </Typography>
                              </Box>
                              <Typography
                                variant="body2"
                                sx={{ color: 'text.secondary', fontSize: '0.8rem' }}
                              >
                                {phrase.culturalNote}
                              </Typography>
                            </Box>
                          )}
                        </Stack>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          );
        })}
      </Stack>

      <AuthGatedSaveDialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        phrases={phrasesToSave}
        onSaved={() => setDeckSaved(true)}
        defaultDeckName={
          activeSituationInfo
            ? `${activeSituationInfo.icon} Travel: ${activeSituationInfo.label}`
            : '🗾 Travel: All Survival Phrases'
        }
      />
    </Container>
  );
}

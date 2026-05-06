'use client';

import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BookmarkAddedIcon from '@mui/icons-material/BookmarkAdded';
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
import { useState } from 'react';

import { stripFurigana } from '@/components/FuriganaText';
import { useSpeech } from '@/hooks/useSpeech';
import { useSurvivalPhrases } from '@/hooks/useTravel';
import type { PhraseSituation } from '@/types/travel';

import { SaveToDeckDialog } from './SaveToDeckDialog';
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
  const { phrases, activeSituation, loadPhrases, reset: resetPhrases } = useSurvivalPhrases();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deckDialogOpen, setDeckDialogOpen] = useState(false);
  const [deckSaved, setDeckSaved] = useState(false);

  // Situation selection
  if (!activeSituation) {
    return (
      <Container maxWidth="sm" sx={{ py: { xs: 3, sm: 4 }, px: { xs: 2, sm: 3 } }}>
        <Stack spacing={3}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <IconButton onClick={() => router.push('/travel')} aria-label="Back to travel hub">
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography
                variant="h5"
                sx={{ fontWeight: 800, fontFamily: (t) => t.fonts.display, color: 'text.primary' }}
              >
                Survival Phrases
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                Essential phrases with pronunciation and tips
              </Typography>
            </Box>
          </Box>

          <Stack spacing={1.25}>
            {SITUATIONS.map((s) => (
              <Box
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 2,
                  cursor: 'pointer',
                  borderRadius: '16px',
                  bgcolor: 'background.paper',
                  border: `1px solid ${alpha(s.color, 0.15)}`,
                  boxShadow: `0 1px 3px ${alpha(s.color, 0.08)}`,
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: `0 8px 24px ${alpha(s.color, 0.15)}`,
                    borderColor: alpha(s.color, 0.4),
                    '& .sit-icon': { transform: 'scale(1.08)' },
                  },
                  '&:active': { transform: 'translateY(0)' },
                }}
              >
                <Box
                  className="sit-icon"
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha(s.color, 0.08),
                    border: `1px solid ${alpha(s.color, 0.15)}`,
                    flexShrink: 0,
                    transition: 'transform 0.25s ease',
                  }}
                >
                  <Typography sx={{ fontSize: '1.4rem', lineHeight: 1 }}>{s.icon}</Typography>
                </Box>
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    color: 'text.primary',
                    lineHeight: 1.3,
                  }}
                >
                  {s.label}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Stack>
      </Container>
    );
  }

  const situationInfo = SITUATIONS.find((s) => s.key === activeSituation);

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 3, sm: 4 }, px: { xs: 2, sm: 3 } }}>
      <Stack spacing={2.5}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={resetPhrases} aria-label="Back to situations">
            <ArrowBackIcon />
          </IconButton>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(situationInfo?.color ?? brand[100], 0.1),
              border: `1px solid ${alpha(situationInfo?.color ?? brand[200], 0.2)}`,
            }}
          >
            <Typography sx={{ fontSize: '1.1rem', lineHeight: 1 }}>
              {situationInfo?.icon}
            </Typography>
          </Box>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: '1.05rem',
              fontFamily: (t) => t.fonts.display,
              color: 'text.primary',
              flex: 1,
            }}
          >
            {situationInfo?.label}
          </Typography>
          {/* Save to deck button */}
          {phrases.length > 0 &&
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
                onClick={() => setDeckDialogOpen(true)}
                size="small"
                variant="outlined"
                sx={{ textTransform: 'none', borderRadius: '20px', fontSize: '0.72rem' }}
              >
                Save all
              </Button>
            ))}
        </Box>

        {/* Phrases */}
        <Stack spacing={1.5}>
          {phrases.map((phrase) => {
            const isExpanded = expandedId === phrase.id;
            const diff = DIFFICULTY_LABELS[phrase.difficulty] ?? DIFFICULTY_LABELS[1];
            const form = FORMALITY_LABELS[phrase.formality] ?? FORMALITY_LABELS.polite;

            return (
              <Box
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
                  p: 2,
                  borderRadius: '14px',
                  cursor: 'pointer',
                  bgcolor: 'background.paper',
                  border: `1px solid ${alpha(brand[300], 0.2)}`,
                  boxShadow: `0 1px 3px ${alpha(brand[400], 0.06)}`,
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: alpha(brand[400], 0.4),
                    boxShadow: `0 4px 12px ${alpha(brand[400], 0.1)}`,
                  },
                }}
              >
                {/* Main content */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5, fontSize: '0.84rem' }}
                    >
                      {phrase.english}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                      <TravelPhrase
                        japanese={phrase.japanese}
                        romaji={phrase.romaji}
                        primarySize="1.05rem"
                        secondarySize="0.78rem"
                      />
                      <Tooltip title="Listen">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            speak(stripFurigana(phrase.japanese));
                          }}
                          aria-label="Listen to pronunciation"
                          sx={{ p: 0.5 }}
                        >
                          <VolumeUpIcon sx={{ fontSize: 16 }} />
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

                {/* Expanded content */}
                {isExpanded && (
                  <Box sx={{ mt: 1.5, pt: 1.5, borderTop: `1px solid ${alpha(brand[200], 0.3)}` }}>
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
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
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
                )}
              </Box>
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

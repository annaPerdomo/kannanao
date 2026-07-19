'use client';

import AddIcon from '@mui/icons-material/Add';
import BookmarkAddedIcon from '@mui/icons-material/BookmarkAdded';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import SchoolIcon from '@mui/icons-material/School';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { alpha, Box, Button, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import { stripFurigana } from '@/components/FuriganaText';
import { PageHeader } from '@/components/PageHeader';
import { useSpeech } from '@/hooks/useSpeech';
import { logTravelEvent } from '@/lib/supabase';
import { LAYOUT } from '@/theme';
import type { PhraseSituation } from '@/types/travel';

import { SURVIVAL_PHRASES } from '../../hooks/survivalPhrasesData';
import { AuthGatedSaveDialog } from './AuthGatedSaveDialog';
import { TravelPhrase } from './TravelPhrase';

const SITUATIONS: Array<{
  key: PhraseSituation;
  labelKey: string;
  icon: string;
  color: string;
}> = [
  { key: 'greetings', labelKey: 'situations.greetings', icon: '👋', color: '#f59e0b' },
  { key: 'restaurant', labelKey: 'situations.restaurant', icon: '🍜', color: '#ef4444' },
  { key: 'shopping', labelKey: 'situations.shopping', icon: '🛍️', color: '#8b5cf6' },
  { key: 'transport', labelKey: 'situations.transport', icon: '🚃', color: '#3b82f6' },
  { key: 'hotel', labelKey: 'situations.hotel', icon: '🏨', color: '#6366f1' },
  { key: 'directions', labelKey: 'situations.directions', icon: '🗺️', color: '#10b981' },
  { key: 'polite', labelKey: 'situations.polite', icon: '🎌', color: '#ec4899' },
  { key: 'numbers', labelKey: 'situations.numbers', icon: '🔢', color: '#f97316' },
  { key: 'emergency', labelKey: 'situations.emergency', icon: '🆘', color: '#dc2626' },
];

const DIFFICULTY_LABELS: Record<number, { labelKey: string; color: string }> = {
  1: { labelKey: 'difficulty.easy', color: '#10b981' },
  2: { labelKey: 'difficulty.medium', color: '#f59e0b' },
  3: { labelKey: 'difficulty.longer', color: '#8b5cf6' },
};

const FORMALITY_LABELS: Record<string, { labelKey: string; icon: string }> = {
  casual: { labelKey: 'formality.casual', icon: '😊' },
  polite: { labelKey: 'formality.polite', icon: '🙇' },
  very_polite: { labelKey: 'formality.veryPolite', icon: '🎩' },
};

export function PhraseBrowser() {
  const t = useTranslations('Travel.phrases');
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
    setDeckSaved(false);
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
    <Box
      sx={{ maxWidth: LAYOUT.narrowMaxWidth, mx: 'auto', px: LAYOUT.pagePx, py: { xs: 3, sm: 4 } }}
    >
      <Stack spacing={3}>
        {/* Header */}
        <PageHeader
          title={t('title')}
          subtitle={t('subtitle')}
          onBack={() => router.push('/travel')}
          mb={0}
          action={
            filteredPhrases.length > 0 &&
            (deckSaved ? (
              <Chip
                icon={<BookmarkAddedIcon sx={{ fontSize: '14px !important' }} />}
                label={t('saved')}
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
                {t('saveAll')}
              </Button>
            ))
          }
        />

        {/* Filter chips */}
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
          <Chip
            label={t('all')}
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
              label={`${s.icon} ${t(s.labelKey)}`}
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
                    {t(situation.labelKey)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {t('phraseCount', { count: phrasesInSituation.length })}
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
                            <Tooltip title={t('listen')}>
                              <IconButton
                                size="small"
                                onClick={() => speak(stripFurigana(phrase.japanese))}
                                aria-label={t('listenAria')}
                                sx={{ p: 0.5 }}
                              >
                                <VolumeUpIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={t('saveToDeck')}>
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
                                aria-label={t('savePhraseAria')}
                                sx={{ p: 0.5 }}
                              >
                                <BookmarkBorderIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                        <Stack spacing={0.5} alignItems="flex-end">
                          <Chip
                            label={t(diff.labelKey)}
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
                            label={`${form.icon} ${t(form.labelKey)}`}
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
                              {t('breakdown')}
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
                              {t('whenToUse')}
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
                                  {t('culturalNote')}
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
            ? `${activeSituationInfo.icon} ${t('deckName', { label: t(activeSituationInfo.labelKey) })}`
            : `🗾 ${t('deckNameAll')}`
        }
      />
    </Box>
  );
}

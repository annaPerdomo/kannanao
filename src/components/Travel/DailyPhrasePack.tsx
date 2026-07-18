'use client';

import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import HearingIcon from '@mui/icons-material/Hearing';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import {
  alpha,
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { stripFurigana } from '@/components/FuriganaText';
import { Loading } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { useTravelDisplay } from '@/contexts/TravelDisplayContext';
import { useSpeech } from '@/hooks/useSpeech';
import { logTravelEvent, sb } from '@/lib/supabase';
import { LAYOUT } from '@/theme';

import { SaveToDeckDialog } from './SaveToDeckDialog';
import { TravelPhrase } from './TravelPhrase';

interface DailyPhrase {
  japanese: string;
  romaji: string;
  english: string;
  when: string;
  type: 'say' | 'hear';
}

interface DailyResult {
  phrases: DailyPhrase[];
  dayTip: string;
}

export function DailyPhrasePack() {
  const t = useTranslations('Travel.dailyPack');
  const tc = useTranslations('Common');
  const theme = useTheme();
  const { brand } = theme.palette;
  const router = useRouter();
  const { speak } = useSpeech();
  const { mode: displayMode } = useTravelDisplay();
  const examplePlans = t.raw('examplePlans') as string[];

  const [plans, setPlans] = useState('');
  const [result, setResult] = useState<DailyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deckDialogOpen, setDeckDialogOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const generate = useCallback(async () => {
    if (!plans.trim()) return;
    const cacheKey = `travel:daily:${displayMode}:${plans.trim().toLowerCase()}`;

    // Check sessionStorage cache first
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setResult(JSON.parse(cached));
        setSaved(false);
        return;
      }
    } catch {
      /* sessionStorage unavailable */
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(false);
    try {
      const { data: sessionData } = await sb.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch('/api/travel/daily', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ plans: plans.trim(), displayMode }),
      });
      if (!res.ok) throw new Error(t('generateFailed'));
      const data: DailyResult = await res.json();
      setResult(data);
      logTravelEvent('daily_phrase', 'generate');

      // Cache the result
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(data));
      } catch {
        /* full */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  }, [plans, displayMode, t, tc]);

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
        />

        {/* Input */}
        {!result && !loading && (
          <Box
            sx={{
              p: 2.5,
              borderRadius: '16px',
              bgcolor: 'background.paper',
              border: `1px solid ${alpha(brand[300], 0.2)}`,
              boxShadow: `0 1px 3px ${alpha(brand[400], 0.08)}`,
            }}
          >
            <Stack spacing={2}>
              <TextField
                multiline
                rows={3}
                placeholder={t('planPlaceholder')}
                value={plans}
                onChange={(e) => setPlans(e.target.value)}
                fullWidth
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
              />

              <Box>
                <Typography
                  variant="caption"
                  sx={{ color: 'text.disabled', mb: 0.75, display: 'block', fontSize: '0.68rem' }}
                >
                  {t('tryExample')}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {examplePlans.map((example, i) => (
                    <Chip
                      key={i}
                      label={example.length > 40 ? example.slice(0, 40) + '...' : example}
                      size="small"
                      onClick={() => setPlans(example)}
                      sx={{
                        fontSize: '0.68rem',
                        borderRadius: '20px',
                        bgcolor: alpha(brand[50], 0.8),
                        border: `1px solid ${alpha(brand[200], 0.3)}`,
                        transition: 'all 0.15s',
                        '&:hover': {
                          bgcolor: alpha(brand[100], 0.8),
                          borderColor: alpha(brand[300], 0.4),
                        },
                      }}
                    />
                  ))}
                </Box>
              </Box>

              <Button
                onClick={generate}
                variant="contained"
                disabled={!plans.trim()}
                startIcon={<AutoAwesomeIcon />}
                sx={{ textTransform: 'none', borderRadius: '20px', alignSelf: 'flex-start' }}
              >
                {t('generateButton')}
              </Button>

              {error && (
                <Typography variant="body2" sx={{ color: 'error.main' }}>
                  {error}
                </Typography>
              )}
            </Stack>
          </Box>
        )}

        {/* Loading */}
        {loading && <Loading message={t('generatingMessage')} />}

        {/* Results */}
        {result && (
          <>
            {/* Day tip */}
            {result.dayTip && (
              <Box
                sx={{
                  p: 2,
                  borderRadius: '12px',
                  bgcolor: alpha(brand[50], 0.6),
                  border: `1px solid ${alpha(brand[200], 0.3)}`,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ color: 'text.secondary', fontStyle: 'italic', fontSize: '0.82rem' }}
                >
                  {result.dayTip}
                </Typography>
              </Box>
            )}

            {/* Phrase list */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                gap: 1.5,
              }}
            >
              {result.phrases.map((phrase, i) => (
                <Box
                  key={i}
                  sx={{
                    p: 2,
                    borderRadius: '14px',
                    bgcolor: 'background.paper',
                    border: `1px solid ${alpha(
                      phrase.type === 'hear' ? '#f59e0b' : brand[300],
                      0.2,
                    )}`,
                    borderLeft: `3px solid ${phrase.type === 'hear' ? '#f59e0b' : brand[500]}`,
                    boxShadow: `0 1px 3px ${alpha(brand[400], 0.05)}`,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Box sx={{ flex: 1 }}>
                      {/* Type badge */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        {phrase.type === 'say' ? (
                          <RecordVoiceOverIcon sx={{ fontSize: 12, color: brand[500] }} />
                        ) : (
                          <HearingIcon sx={{ fontSize: 12, color: '#f59e0b' }} />
                        )}
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.6rem',
                            color: phrase.type === 'hear' ? '#f59e0b' : brand[500],
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          {phrase.type === 'say' ? t('youSay') : t('youllHear')}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: 'text.disabled', ml: 'auto', fontSize: '0.65rem' }}
                        >
                          {phrase.when}
                        </Typography>
                      </Box>

                      {/* Japanese + romaji */}
                      <TravelPhrase japanese={phrase.japanese} romaji={phrase.romaji} />
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: 'text.primary',
                          mt: 0.25,
                          fontSize: '0.84rem',
                        }}
                      >
                        {phrase.english}
                      </Typography>
                    </Box>

                    <Tooltip title={t('listen')}>
                      <IconButton
                        size="small"
                        onClick={() => speak(stripFurigana(phrase.japanese))}
                        aria-label={t('listen')}
                        sx={{ p: 0.5 }}
                      >
                        <VolumeUpIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              ))}
            </Box>

            {/* Actions */}
            <Stack direction="row" spacing={1.5} justifyContent="center">
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setResult(null);
                  setPlans('');
                  setSaved(false);
                }}
                sx={{ textTransform: 'none', borderRadius: '20px', fontSize: '0.8rem' }}
              >
                {t('newDay')}
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={() => setDeckDialogOpen(true)}
                disabled={saved}
                startIcon={<LibraryAddIcon sx={{ fontSize: 14 }} />}
                sx={{ textTransform: 'none', borderRadius: '20px', fontSize: '0.8rem' }}
              >
                {saved ? t('saved') : t('saveToDeck')}
              </Button>
            </Stack>
          </>
        )}
      </Stack>

      {result && (
        <SaveToDeckDialog
          open={deckDialogOpen}
          onClose={() => setDeckDialogOpen(false)}
          phrases={result.phrases.map((p) => ({
            japanese: p.japanese,
            romaji: p.romaji,
            english: p.english,
          }))}
          onSaved={() => setSaved(true)}
          defaultDeckName={t('todaysPhrasesDeckName')}
        />
      )}
    </Box>
  );
}

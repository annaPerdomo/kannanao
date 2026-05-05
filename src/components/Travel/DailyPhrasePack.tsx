'use client';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import HearingIcon from '@mui/icons-material/Hearing';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import {
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
import { useCallback, useState } from 'react';

import { Loading } from '@/components/Loading';
import { useSpeech } from '@/hooks/useSpeech';

import { SaveToDeckDialog } from './SaveToDeckDialog';

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

const EXAMPLE_PLANS = [
  'Taking the train to Shibuya, shopping, then ramen for lunch',
  'Visiting Fushimi Inari shrine, then exploring Nishiki Market',
  'Checking out of hotel, taking shinkansen to Osaka, checking into new hotel',
  'Going to TeamLab, then Odaiba for dinner at a sushi restaurant',
  'Spending the day in Akihabara, visiting arcades, getting a coffee',
];

export function DailyPhrasePack() {
  const theme = useTheme();
  const { brand } = theme.palette;
  const router = useRouter();
  const { speak } = useSpeech();

  const [plans, setPlans] = useState('');
  const [result, setResult] = useState<DailyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deckDialogOpen, setDeckDialogOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const generate = useCallback(async () => {
    if (!plans.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(false);
    try {
      const res = await fetch('/api/travel/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plans: plans.trim() }),
      });
      if (!res.ok) throw new Error('Failed to generate phrases');
      const data: DailyResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [plans]);

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={() => router.push('/travel')} aria-label="Back to travel hub">
            <ArrowBackIcon />
          </IconButton>
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, fontFamily: (t) => t.fonts.display, color: 'text.primary' }}
          >
            Daily Phrase Pack
          </Typography>
        </Box>

        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Tell me your plans for today and I&apos;ll generate the exact phrases you&apos;ll need —
          things to say AND things you&apos;ll hear.
        </Typography>

        {/* Input */}
        {!result && !loading && (
          <Card
            sx={{
              p: 2.5,
              borderRadius: 3,
              border: `1px solid ${alpha(brand[300], 0.3)}`,
            }}
          >
            <Stack spacing={2}>
              <TextField
                multiline
                rows={3}
                placeholder="e.g. Taking the train to Asakusa, visiting Senso-ji temple, then finding a good ramen shop for lunch..."
                value={plans}
                onChange={(e) => setPlans(e.target.value)}
                fullWidth
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />

              <Box>
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', mb: 0.75, display: 'block' }}
                >
                  Or try an example:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {EXAMPLE_PLANS.map((example, i) => (
                    <Chip
                      key={i}
                      label={example.length > 40 ? example.slice(0, 40) + '...' : example}
                      size="small"
                      onClick={() => setPlans(example)}
                      sx={{
                        fontSize: '0.7rem',
                        borderRadius: 2,
                        bgcolor: alpha(brand[100], 0.5),
                        '&:hover': { bgcolor: alpha(brand[200], 0.5) },
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
                sx={{ textTransform: 'none', borderRadius: 2, alignSelf: 'flex-start' }}
              >
                Generate my phrases
              </Button>

              {error && (
                <Typography variant="body2" sx={{ color: 'error.main' }}>
                  {error}
                </Typography>
              )}
            </Stack>
          </Card>
        )}

        {/* Loading */}
        {loading && <Loading message="Generating your phrases..." />}

        {/* Results */}
        {result && (
          <>
            {/* Day tip */}
            {result.dayTip && (
              <Card
                sx={{
                  p: 2,
                  borderRadius: 3,
                  background: alpha(brand[50], 0.6),
                  border: `1px solid ${alpha(brand[300], 0.25)}`,
                }}
              >
                <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                  {result.dayTip}
                </Typography>
              </Card>
            )}

            {/* Phrase list */}
            <Stack spacing={1.5}>
              {result.phrases.map((phrase, i) => (
                <Card
                  key={i}
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    border: `1px solid ${alpha(
                      phrase.type === 'hear' ? '#f59e0b' : brand[300],
                      0.3,
                    )}`,
                    borderLeft: `4px solid ${phrase.type === 'hear' ? '#f59e0b' : brand[500]}`,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Box sx={{ flex: 1 }}>
                      {/* Type badge */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                        {phrase.type === 'say' ? (
                          <RecordVoiceOverIcon sx={{ fontSize: 14, color: brand[500] }} />
                        ) : (
                          <HearingIcon sx={{ fontSize: 14, color: '#f59e0b' }} />
                        )}
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 700,
                            color: phrase.type === 'hear' ? '#f59e0b' : brand[500],
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          {phrase.type === 'say' ? 'You say' : "You'll hear"}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.disabled', ml: 'auto' }}>
                          {phrase.when}
                        </Typography>
                      </Box>

                      {/* Japanese + romaji */}
                      <Typography
                        sx={{
                          fontFamily: (t) => t.fonts.jp,
                          fontSize: '1.05rem',
                          fontWeight: 500,
                          color: 'text.primary',
                        }}
                      >
                        {phrase.japanese}
                      </Typography>
                      <Typography variant="caption" sx={{ color: brand[600] }}>
                        {phrase.romaji}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, color: 'text.primary', mt: 0.25 }}
                      >
                        {phrase.english}
                      </Typography>
                    </Box>

                    <Tooltip title="Listen">
                      <IconButton
                        size="small"
                        onClick={() => speak(phrase.japanese)}
                        aria-label="Listen"
                      >
                        <VolumeUpIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Card>
              ))}
            </Stack>

            {/* Actions */}
            <Stack direction="row" spacing={1.5}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setResult(null);
                  setPlans('');
                  setSaved(false);
                }}
                sx={{ textTransform: 'none', borderRadius: 2 }}
              >
                New day
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={() => setDeckDialogOpen(true)}
                disabled={saved}
                sx={{ textTransform: 'none', borderRadius: 2 }}
              >
                {saved ? 'Saved to deck!' : 'Save as flashcard deck'}
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
          defaultDeckName="Today's Phrases"
        />
      )}
    </Container>
  );
}

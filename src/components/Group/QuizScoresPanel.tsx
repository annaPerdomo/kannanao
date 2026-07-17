'use client';
import DownloadIcon from '@mui/icons-material/Download';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { Loading } from '@/components/Loading';
import { useQuizResults } from '@/hooks/useQuizResults';
import { quizResultsToCsv } from '@/lib/quiz';

interface DeckLite {
  id: string;
  name: string;
  emoji?: string | null;
}

interface QuizScoresPanelProps {
  decks: DeckLite[];
  groupId: string;
}

/** Trigger a client-side CSV download without any server round-trip. */
function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Organizer-facing "Quiz scores" section for the group dashboard. Pick a deck,
 * see each member's best + latest score and attempt count, and download it all
 * as a CSV for a gradebook. This is where quiz complexity lives — the student
 * side stays a friendly stars-and-score finish.
 */
export function QuizScoresPanel({ decks, groupId }: QuizScoresPanelProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const t = useTranslations('Group.quizScores');
  const [selectedDeck, setSelectedDeck] = useState<string>(decks[0]?.id ?? '');
  const { rows, loading, error } = useQuizResults(selectedDeck || null, groupId);

  const deck = useMemo(() => decks.find((d) => d.id === selectedDeck), [decks, selectedDeck]);
  const anyAttempts = rows.some((r) => r.attempts > 0);

  if (decks.length === 0) return null;

  const handleDownload = () => {
    if (!deck) return;
    const csv = quizResultsToCsv(rows, deck.name);
    const safe = deck.name.replace(/[^\w-]+/g, '_').slice(0, 40) || 'deck';
    downloadCsv(`quiz-scores-${safe}.csv`, csv);
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: '0.85rem',
            color: brand[700],
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          {t('heading')}
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
          onClick={handleDownload}
          disabled={!anyAttempts}
          sx={{
            borderRadius: 2.5,
            textTransform: 'none',
            fontWeight: 700,
            borderColor: alpha(brand[400], 0.5),
            color: brand[700],
          }}
        >
          {t('downloadCsv')}
        </Button>
      </Box>

      {/* Deck picker */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
        {decks.map((d) => {
          const selected = d.id === selectedDeck;
          return (
            <Box
              key={d.id}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              onClick={() => setSelectedDeck(d.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedDeck(d.id);
                }
              }}
              sx={{
                px: 1.5,
                py: 0.75,
                borderRadius: 2,
                border: `1.5px solid ${selected ? brand[500] : alpha(brand[300], 0.4)}`,
                bgcolor: selected ? alpha(brand[100], 0.8) : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                '&:hover': { borderColor: brand[400] },
              }}
            >
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: brand[800] }}>
                {d.emoji || '📚'} {d.name}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {error ? (
        <Typography sx={{ color: 'error.main', fontSize: '0.8rem' }}>{error}</Typography>
      ) : loading ? (
        <Loading message={t('loading')} />
      ) : (
        <Paper
          elevation={0}
          sx={{
            border: `1.5px solid ${alpha(brand[300], 0.35)}`,
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          {/* Header row */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1.6fr 1fr 1fr 0.8fr',
              px: 2,
              py: 1,
              bgcolor: alpha(brand[100], 0.5),
              fontSize: '0.68rem',
              fontWeight: 800,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: brand[700],
            }}
          >
            <Box>{t('colMember')}</Box>
            <Box sx={{ textAlign: 'center' }}>{t('colBest')}</Box>
            <Box sx={{ textAlign: 'center' }}>{t('colLatest')}</Box>
            <Box sx={{ textAlign: 'center' }}>{t('colTries')}</Box>
          </Box>

          {rows.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                {t('noMembers')}
              </Typography>
            </Box>
          ) : !anyAttempts ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                {t('noAttempts')}
              </Typography>
            </Box>
          ) : (
            rows.map((r, i) => (
              <Box
                key={r.memberId}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1.6fr 1fr 1fr 0.8fr',
                  px: 2,
                  py: 1.25,
                  alignItems: 'center',
                  fontSize: '0.82rem',
                  borderTop: i === 0 ? 'none' : `1px solid ${alpha(brand[300], 0.2)}`,
                }}
              >
                <Box sx={{ fontWeight: 600, color: 'text.primary', minWidth: 0 }}>{r.name}</Box>
                <Box sx={{ textAlign: 'center', color: 'text.primary' }}>
                  {r.best ? `${r.best.score}/${r.best.total}` : '—'}
                </Box>
                <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
                  {r.latest ? `${r.latest.score}/${r.latest.total}` : '—'}
                </Box>
                <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>{r.attempts || '—'}</Box>
              </Box>
            ))
          )}
        </Paper>
      )}
    </Box>
  );
}

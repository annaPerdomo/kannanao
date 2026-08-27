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
import type { QuizScoreRow } from '@/lib/quiz';
import { quizResultsToCsv } from '@/lib/quiz';

import { DeckPicker } from './DeckPicker';
import { SectionCard } from './SectionCard';
import { ShowMoreButton } from './ShowMoreButton';
import { timeAgo } from './timeAgo';

/** member | best | latest | tries — the score table's shared column track. */
const GRID_COLUMNS = '1.6fr 1fr 1fr 0.7fr';
const ROWS_SHOWN = 8;

/** Not-yet-taken first, then lowest best score — the rows worth acting on lead. */
export function rankQuizRows(rows: QuizScoreRow[]): QuizScoreRow[] {
  return [...rows].sort((a, b) => {
    if (a.attempts === 0 || b.attempts === 0) return a.attempts - b.attempts;
    return (a.best?.accuracy ?? 0) - (b.best?.accuracy ?? 0);
  });
}

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
  const tTime = useTranslations('Group.timeAgo');
  const [selectedDeck, setSelectedDeck] = useState<string>(decks[0]?.id ?? '');
  const [expanded, setExpanded] = useState(false);
  const { rows, loading, error, errorMessage } = useQuizResults(selectedDeck || null, groupId);

  const deck = useMemo(() => decks.find((d) => d.id === selectedDeck), [decks, selectedDeck]);
  const anyAttempts = rows.some((r) => r.attempts > 0);

  const ranked = useMemo(() => rankQuizRows(rows), [rows]);
  const taken = rows.filter((r) => r.attempts > 0);
  const average =
    taken.length > 0
      ? Math.round(taken.reduce((sum, r) => sum + (r.best?.accuracy ?? 0), 0) / taken.length)
      : 0;
  const visible = expanded ? ranked : ranked.slice(0, ROWS_SHOWN);

  if (decks.length === 0) {
    return (
      <SectionCard title={t('heading')}>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            textAlign: 'center',
            border: `1.5px dashed ${alpha(brand[300], 0.4)}`,
            borderRadius: theme.radii.md,
            bgcolor: alpha(brand[50], 0.6),
          }}
        >
          <Typography sx={{ fontSize: '1.5rem', mb: 0.5 }}>📊</Typography>
          <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
            {t('noDecksBody')}
          </Typography>
        </Paper>
      </SectionCard>
    );
  }

  const handleDownload = () => {
    if (!deck) return;
    const csv = quizResultsToCsv(rows, deck.name);
    const safe = deck.name.replace(/[^\w-]+/g, '_').slice(0, 40) || 'deck';
    downloadCsv(`quiz-scores-${safe}.csv`, csv);
  };

  return (
    <SectionCard
      title={t('heading')}
      action={
        <Button
          variant="outlined"
          size="small"
          startIcon={<DownloadIcon sx={{ fontSize: 16 }} />}
          onClick={handleDownload}
          disabled={!anyAttempts}
          sx={{
            borderRadius: theme.radii.sm,
            textTransform: 'none',
            fontWeight: 700,
            borderColor: alpha(brand[400], 0.5),
            color: brand[700],
          }}
        >
          {t('downloadCsv')}
        </Button>
      }
    >
      <DeckPicker decks={decks} value={selectedDeck} onChange={setSelectedDeck} />

      {error ? (
        <Typography sx={{ color: 'error.main', fontSize: '0.85rem' }}>{errorMessage}</Typography>
      ) : loading ? (
        <Loading message={t('loading')} />
      ) : (
        <Box>
          {rows.length > 0 && (
            <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', mb: 1 }}>
              {t('summary', { taken: taken.length, total: rows.length, average })}
            </Typography>
          )}

          {/* Header row */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: GRID_COLUMNS,
              px: 1,
              py: 0.75,
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'text.secondary',
              borderBottom: `1px solid ${alpha(brand[300], 0.35)}`,
            }}
          >
            <Box>{t('colMember')}</Box>
            <Box sx={{ textAlign: 'center' }}>{t('colBest')}</Box>
            <Box sx={{ textAlign: 'center' }}>{t('colLatest')}</Box>
            <Box sx={{ textAlign: 'center' }}>{t('colTries')}</Box>
          </Box>

          {rows.length === 0 ? (
            <Box sx={{ py: 3, textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                {t('noMembers')}
              </Typography>
            </Box>
          ) : !anyAttempts ? (
            <Box sx={{ py: 3, textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                {t('noAttempts')}
              </Typography>
            </Box>
          ) : (
            visible.map((r) => (
              <Box
                key={r.memberId}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: GRID_COLUMNS,
                  px: 1,
                  py: 1.1,
                  alignItems: 'center',
                  fontSize: '0.88rem',
                  borderBottom: `1px solid ${alpha(brand[300], 0.2)}`,
                }}
              >
                <Box sx={{ fontWeight: 700, color: 'text.primary', minWidth: 0 }}>{r.name}</Box>
                <Box sx={{ textAlign: 'center', fontWeight: 700, color: 'text.primary' }}>
                  {r.best ? `${r.best.score}/${r.best.total}` : '—'}
                </Box>
                <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
                  {r.latest ? `${r.latest.score}/${r.latest.total}` : '—'}
                  {r.latest && (
                    <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', mt: 0.15 }}>
                      {t('lastTaken', { date: timeAgo(r.latest.takenAt, tTime) })}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>{r.attempts || '—'}</Box>
              </Box>
            ))
          )}

          {anyAttempts && ranked.length > ROWS_SHOWN && (
            <ShowMoreButton
              expanded={expanded}
              total={ranked.length}
              onClick={() => setExpanded((v) => !v)}
            />
          )}
        </Box>
      )}
    </SectionCard>
  );
}

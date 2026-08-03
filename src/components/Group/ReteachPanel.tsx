'use client';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Loading } from '@/components/Loading';
import type { Deck } from '@/types/deck';

import { useItemAnalysis } from '../../hooks/useItemAnalysis';
import { DeckPicker } from './DeckPicker';
import { WordStruggleChart } from './GroupCharts';
import { SectionCard } from './SectionCard';
import { ShowMoreButton } from './ShowMoreButton';

const COLLAPSED_ROWS = 5;

interface ReteachPanelProps {
  /** The organizer's own decks (already filtered to non-shared). */
  decks: Deck[];
}

/**
 * Turns one card's stats into a plain sentence a busy teacher can act on.
 * `t` is optional so this stays a pure, easily-testable function in English;
 * the panel always passes its translator so the rendered copy is localized.
 */
export function reteachSentence(
  struggling: number,
  attempts: number,
  t?: ReturnType<typeof useTranslations<'Group.reteachPanel'>>,
): string {
  if (struggling === attempts) {
    return t
      ? t('allStudentsStruggling', { attempts })
      : `All ${attempts} student${attempts === 1 ? '' : 's'} who tried it keep missing this word.`;
  }
  return t
    ? t('someStudentsStruggling', { struggling, attempts })
    : `${struggling} of ${attempts} students who tried it keep missing this word.`;
}

/**
 * "What to review again" — a deck picker plus a worst-first bar chart of the
 * words the group is struggling with. The plain sentence behind each bar stays
 * one hover away. Organizer dashboard only; data is organizer-gated server-side.
 */
export function ReteachPanel({ decks }: ReteachPanelProps) {
  const t = useTranslations('Group.reteachPanel');
  const theme = useTheme();
  const { brand } = theme.palette;
  const [deckId, setDeckId] = useState<string>('');
  const [expanded, setExpanded] = useState(false);
  const { analysis, loading, error } = useItemAnalysis(deckId || null);

  if (decks.length === 0) return null;

  const tricky = (analysis?.cards ?? [])
    .filter((c) => c.strugglingCount > 0)
    .sort((a, b) => b.strugglingPct - a.strugglingPct);

  const visible = expanded ? tricky : tricky.slice(0, COLLAPSED_ROWS);

  return (
    <SectionCard title={t('heading')}>
      <DeckPicker decks={decks} value={deckId} onChange={setDeckId} />

      {!deckId ? (
        <Box sx={{ py: 2.5, textAlign: 'center' }}>
          <MenuBookIcon sx={{ fontSize: 32, color: alpha(brand[400], 0.6), mb: 0.5 }} />
          <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
            {t('pickDeckBody')}
          </Typography>
        </Box>
      ) : loading ? (
        <Loading message={t('checkingMessage')} />
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : tricky.length === 0 ? (
        <Box sx={{ py: 2.5, textAlign: 'center' }}>
          <Typography sx={{ fontSize: '1.75rem', mb: 0.5 }}>🎉</Typography>
          <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
            {t('noTrickyWords')}
          </Typography>
        </Box>
      ) : (
        <>
          <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mb: 0.5 }}>
            {t('chartCaption')}
          </Typography>
          <WordStruggleChart
            words={visible.map((c) => ({
              id: c.cardId,
              label: c.word + (c.reading ? ` (${c.reading})` : ''),
              sublabel: c.meaning ?? undefined,
              pct: c.strugglingPct,
              detail: `${reteachSentence(c.strugglingCount, c.attemptCount, t)} ${t(
                'percentRight',
                {
                  percent: c.classAccuracy,
                },
              )}`,
            }))}
          />
          {tricky.length > COLLAPSED_ROWS && (
            <ShowMoreButton
              expanded={expanded}
              total={tricky.length}
              onClick={() => setExpanded((v) => !v)}
            />
          )}
        </>
      )}
    </SectionCard>
  );
}

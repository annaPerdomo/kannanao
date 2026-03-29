'use client';
import { useState, useMemo } from 'react';
import { Box, Typography, Button, Grid, Chip, LinearProgress } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import type { Flashcard } from '@/types/flashcard';

interface MatchModeProps {
  cards: Flashcard[];
  onExit: () => void;
}

type Side = 'jp' | 'en';

interface Tile {
  id: string;
  cardId: string;
  side: Side;
  label: string;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export function MatchMode({ cards, onExit }: MatchModeProps) {
  const pool = useMemo(() => cards.slice(0, 8), [cards]);

  const tiles = useMemo<Tile[]>(() => {
    const t: Tile[] = pool.flatMap((c) => [
      { id: `jp-${c.id}`, cardId: c.id, side: 'jp', label: c.word },
      { id: `en-${c.id}`, cardId: c.id, side: 'en', label: c.meaning },
    ]);
    return shuffle(t);
  }, [pool]);

  const [selected, setSelected] = useState<Tile | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  const handleSelect = (tile: Tile) => {
    if (matched.has(tile.cardId)) return;
    if (tile.id === selected?.id) { setSelected(null); return; }

    if (!selected) { setSelected(tile); return; }

    if (selected.cardId === tile.cardId && selected.side !== tile.side) {
      setMatched((prev) => new Set([...prev, tile.cardId]));
      setScore((s) => s + 1);
      setSelected(null);
    } else {
      setWrong(tile.id);
      setTimeout(() => { setWrong(null); setSelected(null); }, 600);
    }
  };

  const done = matched.size === pool.length;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Match</Typography>
        <Chip label={`${score} / ${pool.length}`} />
      </Box>

      <LinearProgress
        variant="determinate"
        value={(matched.size / pool.length) * 100}
        sx={{ mb: 3, height: 3, borderRadius: 1, bgcolor: 'rgba(200,169,126,0.1)', '& .MuiLinearProgress-bar': { bgcolor: 'primary.main' } }}
      />

      {done ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <CheckIcon sx={{ fontSize: 56, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" sx={{ mb: 3 }}>All matched!</Typography>
          <Button variant="outlined" onClick={onExit}>Back to Deck</Button>
        </Box>
      ) : (
        <Grid container spacing={1.5}>
          {tiles.map((tile) => {
            const isMatched = matched.has(tile.cardId);
            const isSelected = selected?.id === tile.id;
            const isWrong = wrong === tile.id || (wrong && selected?.id === tile.id);
            return (
              <Grid size={{ xs: 6, sm: 4, md: 3 }} key={tile.id}>
                <Box
                  onClick={() => !isMatched && handleSelect(tile)}
                  sx={{
                    p: 2,
                    border: '1px solid',
                    borderRadius: 3,
                    textAlign: 'center',
                    cursor: isMatched ? 'default' : 'pointer',
                    minHeight: 72,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s',
                    borderColor: isMatched
                      ? 'success.main'
                      : isWrong
                        ? 'error.main'
                        : isSelected
                          ? 'primary.main'
                          : '#F7D2E5',
                    bgcolor: isMatched
                      ? 'rgba(126,184,154,0.12)'
                      : isWrong
                        ? 'rgba(255,209,220,0.18)'
                        : isSelected
                          ? 'rgba(249,168,212,0.16)'
                          : '#FFF4FB',
                    opacity: isMatched ? 0.75 : 1,
                    '&:hover': !isMatched ? { borderColor: '#EC4899', bgcolor: 'rgba(249,168,212,0.2)' } : {},
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: tile.side === 'jp' ? '"Noto Serif JP", serif' : '"DM Mono", monospace',
                      fontSize: tile.side === 'jp' ? '1.1rem' : '0.8rem',
                      color: 'text.primary',
                    }}
                  >
                    {tile.label}
                  </Typography>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}

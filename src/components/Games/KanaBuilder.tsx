'use client';

import BackspaceOutlinedIcon from '@mui/icons-material/BackspaceOutlined';
import { Alert, alpha, Box, IconButton, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';

import { Loading } from '@/components/Loading';
import { CelebrationScreen } from '@/components/Practice/CelebrationScreen';
import { SpeakButton } from '@/components/SpeakButton';
import { useGameSession } from '@/hooks/useGameSession';
import { useReviewCards } from '@/hooks/useReviewCards';
import { buildKanaTiles } from '@/lib/reviewGames';

import { GameShell } from './GameShell';
import { type KanaWord, pickKanaWords } from './gameWords';

interface Tile {
  id: number;
  char: string;
}

function KanaBoard({ words, onExit }: { words: KanaWord[]; onExit: () => void }) {
  const theme = useTheme();
  const { brand, surfaces } = theme.palette;
  const { answer, finish } = useGameSession('kana-build');

  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [placed, setPlaced] = useState<Tile[]>([]);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [correctFlash, setCorrectFlash] = useState(false);
  // Only the first submission for a word counts toward the score
  const submittedRef = useRef(false);
  const correctCountRef = useRef(0);

  const word = words[index];
  const target = word.target;
  const tiles = useMemo<Tile[]>(
    () => buildKanaTiles(words[index].target).map((char, i) => ({ id: i, char })),
    [words, index],
  );
  const usedIds = new Set(placed.map((t) => t.id));

  const advance = () => {
    submittedRef.current = false;
    setPlaced([]);
    setCorrectFlash(false);
    if (index + 1 >= words.length) {
      setDone(true);
      finish();
    } else {
      setIndex(index + 1);
    }
  };

  const handleTile = (tile: Tile) => {
    if (usedIds.has(tile.id) || correctFlash || placed.length >= target.length) return;
    const next = [...placed, tile];
    setPlaced(next);
    if (next.length === target.length) {
      const guess = next.map((t) => t.char).join('');
      const isCorrect = guess === target;
      if (!submittedRef.current) {
        submittedRef.current = true;
        if (isCorrect) correctCountRef.current += 1;
        // Grade the card once, on the first full submission (existing rule),
        // passing cardId so this word's SRS schedule advances.
        void answer(isCorrect, word.jlpt, word.cardId);
      }
      if (isCorrect) {
        setCorrectFlash(true);
        setTimeout(advance, 900);
      } else {
        setWrongFlash(true);
        setTimeout(() => {
          setWrongFlash(false);
          setPlaced([]);
        }, 650);
      }
    }
  };

  const handleBackspace = () => {
    if (correctFlash || wrongFlash) return;
    setPlaced((p) => p.slice(0, -1));
  };

  if (done) {
    return (
      <CelebrationScreen
        heading="かな Master!"
        subheading={`${correctCountRef.current} / ${words.length} words right on the first try`}
        mode="kana-build"
        onExit={onExit}
      />
    );
  }

  const tileSx = (state: 'idle' | 'used') => ({
    minWidth: 52,
    height: 52,
    px: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 3,
    border: '2px solid',
    borderColor: state === 'used' ? alpha(brand[200], 0.3) : alpha(brand[200], 0.7),
    bgcolor: state === 'used' ? 'transparent' : surfaces.input,
    cursor: state === 'used' ? 'default' : 'pointer',
    opacity: state === 'used' ? 0.3 : 1,
    transition: 'all 0.15s',
    '&:hover': state === 'idle' ? { borderColor: brand[500], bgcolor: alpha(brand[300], 0.2) } : {},
  });

  return (
    <GameShell
      title="Kana Builder"
      emoji="🧩"
      howTo="Tap the kana tiles in the right order to spell the word."
      current={index}
      total={words.length}
      onQuit={async () => {
        await finish();
        onExit();
      }}
    >
      {/* Prompt: English meaning (recall!), plus the kanji/source hint if any */}
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        {word.emoji && (
          <Typography sx={{ fontSize: '2.5rem', lineHeight: 1, mb: 1 }} aria-hidden>
            {word.emoji}
          </Typography>
        )}
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
          Build the Japanese for:
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1.4rem' }}>{word.english}</Typography>
          <SpeakButton text={word.speak} iconSize="1rem" />
        </Box>
        {word.hint && (
          <Typography
            sx={{
              fontFamily: '"Noto Serif JP", serif',
              fontSize: '1.2rem',
              color: 'text.secondary',
            }}
          >
            {word.hint}
          </Typography>
        )}
      </Box>

      {/* Answer slots */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: 1,
          mb: 3,
          animation: wrongFlash ? 'shake 0.4s' : 'none',
          '@keyframes shake': {
            '0%, 100%': { transform: 'translateX(0)' },
            '25%': { transform: 'translateX(-8px)' },
            '75%': { transform: 'translateX(8px)' },
          },
        }}
      >
        {target.split('').map((_, i) => {
          const filled = placed[i];
          return (
            <Box
              key={i}
              sx={{
                width: 52,
                height: 60,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 3,
                border: '2px dashed',
                borderColor: correctFlash
                  ? 'success.main'
                  : wrongFlash
                    ? 'error.main'
                    : filled
                      ? brand[400]
                      : alpha(brand[300], 0.5),
                bgcolor: correctFlash
                  ? alpha(theme.palette.success.main, 0.12)
                  : wrongFlash
                    ? alpha(theme.palette.error.main, 0.08)
                    : filled
                      ? alpha(brand[300], 0.14)
                      : 'transparent',
                transition: 'all 0.15s',
              }}
            >
              <Typography sx={{ fontFamily: '"Noto Serif JP", serif', fontSize: '1.5rem' }}>
                {filled?.char ?? ''}
              </Typography>
            </Box>
          );
        })}
        <IconButton
          aria-label="Remove last character"
          onClick={handleBackspace}
          disabled={placed.length === 0}
          sx={{ alignSelf: 'center' }}
        >
          <BackspaceOutlinedIcon />
        </IconButton>
      </Box>

      {/* Tile pool */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 1 }}>
        {tiles.map((tile) => {
          const used = usedIds.has(tile.id);
          return (
            <Box
              key={tile.id}
              role="button"
              tabIndex={used ? -1 : 0}
              aria-disabled={used || undefined}
              onClick={() => handleTile(tile)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleTile(tile);
                }
              }}
              sx={tileSx(used ? 'used' : 'idle')}
            >
              <Typography sx={{ fontFamily: '"Noto Serif JP", serif', fontSize: '1.4rem' }}>
                {tile.char}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </GameShell>
  );
}

export function KanaBuilder() {
  const router = useRouter();
  const { dueCards, allCards, loading, error } = useReviewCards();
  // Pick the session's words once per load — due cards first, topped up at random.
  const words = useMemo(
    () => (loading ? [] : pickKanaWords(dueCards, allCards)),
    [dueCards, allCards, loading],
  );

  if (loading) return <Loading />;
  if (error) {
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        Couldn’t load your cards: {error}
      </Alert>
    );
  }
  return <KanaBoard words={words} onExit={() => router.push('/review')} />;
}

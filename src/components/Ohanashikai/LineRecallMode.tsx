'use client';

import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect, useMemo, useRef, useState } from 'react';

import FuriganaText, { stripFurigana } from '@/components/FuriganaText';
import { SpeakButton } from '@/components/SpeakButton';
import { useXpAnimation } from '@/contexts/XpAnimationContext';
import { useProgress, XP_PER_CORRECT, XP_PER_WRONG } from '@/hooks/useProgress';
import type { OhanashikaiLine } from '@/types/ohanashikai';

interface LineRecallModeProps {
  lines: OhanashikaiLine[];
  ohanashikaiId: string;
  onExit: () => void;
}

/** Strip punctuation and normalize for comparison */
function normalize(text: string): string {
  return text
    .replace(/[。、！？「」『』・〜…―]/g, '')
    .replace(/[.,!?'"()\-–—]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Get a short hint: first 4–6 chars of the line */
function getHint(text: string): string {
  const chars = [...text]; // handle multi-byte chars
  return chars.slice(0, Math.min(5, Math.ceil(chars.length * 0.2))).join('') + '…';
}

export function LineRecallMode({ lines, ohanashikaiId, onExit }: LineRecallModeProps) {
  const theme = useTheme();
  const { brand, accent, surfaces } = theme.palette;

  // Shuffle line order for varied practice
  const pool = useMemo(() => [...lines].sort(() => Math.random() - 0.5), [lines]);

  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);

  const { startSession, recordAnswer, endSession } = useProgress();
  const { triggerXpEarned } = useXpAnimation();
  const sessionIdRef = useRef<string>('');
  const startTimeRef = useRef<number>(Date.now());
  const correctCountRef = useRef(0);

  useEffect(() => {
    startSession(null, 'speech_recall').then((id) => {
      sessionIdRef.current = id;
      startTimeRef.current = Date.now();
    });
  }, [startSession]);

  const current = pool[index];
  const done = index >= pool.length;

  const check = async () => {
    const correct = normalize(input) === normalize(stripFurigana(current.text));
    setResult(correct ? 'correct' : 'wrong');
    triggerXpEarned(correct ? XP_PER_CORRECT : XP_PER_WRONG);
    if (correct) {
      setScore((s) => s + 1);
      correctCountRef.current += 1;
    }
    if (sessionIdRef.current) {
      await recordAnswer(sessionIdRef.current, correct);
    }
  };

  const reveal = async () => {
    setRevealed(true);
    if (!result && sessionIdRef.current) {
      triggerXpEarned(XP_PER_WRONG);
      await recordAnswer(sessionIdRef.current, false);
      setResult('wrong');
    }
  };

  const next = () => {
    setIndex((i) => i + 1);
    setInput('');
    setResult(null);
    setRevealed(false);
  };

  const handleExit = async () => {
    if (sessionIdRef.current) {
      await endSession(sessionIdRef.current, {
        cardsStudied: index,
        cardsCorrect: correctCountRef.current,
        durationSecs: Math.round((Date.now() - startTimeRef.current) / 1000),
      });
    }
    onExit();
  };

  // End session on natural completion
  useEffect(() => {
    if (done && sessionIdRef.current) {
      endSession(sessionIdRef.current, {
        cardsStudied: pool.length,
        cardsCorrect: correctCountRef.current,
        durationSecs: Math.round((Date.now() - startTimeRef.current) / 1000),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  if (done) {
    const pct = Math.round((score / pool.length) * 100);
    const star = pct === 100 ? '🌟' : pct >= 80 ? '⭐' : pct >= 60 ? '✨' : '🌸';
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography sx={{ fontSize: '4rem', mb: 2 }}>{star}</Typography>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, color: brand[700] }}>
          {pct === 100 ? '完璧！Perfect!' : 'よくがんばりました！'}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 1 }}>
          {score} / {pool.length} lines correct
        </Typography>
        {pct === 100 && (
          <Typography variant="caption" sx={{ display: 'block', color: brand[500], mb: 1 }}>
            You remembered every single line! 🎊
          </Typography>
        )}
        <Stack direction="row" spacing={2} justifyContent="center" mt={4}>
          <Button
            variant="outlined"
            onClick={() => {
              setIndex(0);
              setScore(0);
              correctCountRef.current = 0;
            }}
          >
            Try Again
          </Button>
          <Button variant="contained" onClick={onExit}>
            Back to Speech
          </Button>
        </Stack>
      </Box>
    );
  }

  const hint = getHint(stripFurigana(current.text));

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, color: brand[700] }}>
          🎯 Line Recall
        </Typography>
        <Chip
          label={`${score} ⭐ · ${index + 1}/${pool.length}`}
          sx={{ fontWeight: 800, bgcolor: alpha(brand[100], 0.8) }}
        />
      </Box>

      <LinearProgress
        variant="determinate"
        value={(index / pool.length) * 100}
        sx={{
          mb: 3,
          height: 8,
          borderRadius: 99,
          bgcolor: alpha(brand[200], 0.3),
          '& .MuiLinearProgress-bar': {
            background: `linear-gradient(90deg, ${brand[300]}, ${accent[400]})`,
            borderRadius: 99,
          },
        }}
      />

      {/* Prompt card */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          border: `2px solid ${alpha(brand[300], 0.45)}`,
          borderRadius: 4,
          p: { xs: 3, sm: 4 },
          mb: 3,
          bgcolor: surfaces.input,
          boxShadow: `0 8px 32px ${alpha(brand[300], 0.15)}`,
        }}
      >
        {/* Decorative blob */}
        <Box
          sx={{
            position: 'absolute',
            bottom: -40,
            left: -40,
            width: 140,
            height: 140,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(accent[200], 0.25)}, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />

        <Typography
          variant="caption"
          sx={{
            color: brand[500],
            letterSpacing: '0.14em',
            display: 'block',
            mb: 2,
            fontWeight: 800,
          }}
        >
          🎯 WHAT IS LINE {current.orderIndex + 1}?
        </Typography>

        <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
          <Box
            sx={{
              px: 1.5,
              py: 0.5,
              borderRadius: 2,
              bgcolor: alpha(brand[200], 0.5),
              border: `1px solid ${alpha(brand[300], 0.4)}`,
            }}
          >
            <Typography sx={{ fontFamily: (t) => t.fonts.jp, fontSize: '1rem', color: brand[700] }}>
              {hint}
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            ← hint
          </Typography>
        </Stack>

        {/* Revealed answer */}
        {revealed && (
          <Box
            sx={{
              mt: 2,
              p: 2,
              borderRadius: 3,
              bgcolor: alpha(accent[100], 0.5),
              border: `1px dashed ${alpha(accent[300], 0.6)}`,
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.5}>
              <Typography variant="caption" sx={{ color: accent[600], fontWeight: 800 }}>
                The answer:
              </Typography>
              <SpeakButton
                text={stripFurigana(current.text)}
                iconSize="1rem"
                sx={{ color: accent[400], '&:hover': { color: accent[700] } }}
              />
            </Stack>
            <FuriganaText
              text={current.text}
              showFurigana
              sx={{
                fontFamily: (t) => t.fonts.jp,
                fontSize: '1.1rem',
                lineHeight: 2.4,
                color: 'text.primary',
              }}
            />
          </Box>
        )}

        {/* Result */}
        {result && (
          <Box
            sx={{
              mt: 2,
              p: 1.5,
              borderRadius: 2.5,
              border: '1px solid',
              borderColor: result === 'correct' ? 'success.main' : 'error.main',
              bgcolor: result === 'correct' ? 'rgba(52,211,153,0.1)' : 'rgba(251,113,133,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            {result === 'correct' ? (
              <CheckIcon sx={{ color: 'success.main', fontSize: '1.1rem' }} />
            ) : (
              <CloseIcon sx={{ color: 'error.main', fontSize: '1.1rem' }} />
            )}
            <Typography
              variant="body2"
              color={result === 'correct' ? 'success.main' : 'error.main'}
              sx={{ fontWeight: 700 }}
            >
              {result === 'correct' ? 'Perfect! +10 XP ✨' : 'Not quite… but keep going! +2 XP'}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Input */}
      <Stack spacing={1.5} mb={2}>
        <TextField
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !result && !revealed) void check();
          }}
          label="Type the full line from memory…"
          placeholder="Type here…"
          disabled={!!result || revealed}
          fullWidth
          multiline
          minRows={2}
          autoFocus
        />

        <Stack direction="row" spacing={1.5}>
          {!result && !revealed && (
            <>
              <Button
                variant="contained"
                onClick={check}
                disabled={!input.trim()}
                sx={{ flexShrink: 0 }}
              >
                Check ✓
              </Button>
              <Button
                variant="outlined"
                startIcon={<LightbulbIcon />}
                onClick={reveal}
                color="inherit"
                sx={{ opacity: 0.7, flexShrink: 0 }}
              >
                Show Answer
              </Button>
            </>
          )}
          {(result || revealed) && (
            <Button variant="outlined" onClick={next} sx={{ flexShrink: 0 }}>
              Next →
            </Button>
          )}
        </Stack>
      </Stack>

      <Box sx={{ textAlign: 'right' }}>
        <Button
          size="small"
          color="inherit"
          onClick={handleExit}
          sx={{ opacity: 0.45, fontSize: '0.75rem' }}
        >
          Quit &amp; Save Progress
        </Button>
      </Box>
    </Box>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import type { OhanashikaiLine } from '@/types/ohanashikai';
import { useProgress } from '@/hooks/useProgess';

interface ReadThroughModeProps {
  lines: OhanashikaiLine[];
  ohanashikaiId: string;
  onExit: () => void;
}

const DECORATION_EMOJIS = ['🌸', '✨', '🌟', '💫', '🎀', '🌺', '⭐', '🌷'];

export function ReadThroughMode({ lines, ohanashikaiId, onExit }: ReadThroughModeProps) {
  const theme = useTheme();
  const { brand, accent, surfaces } = theme.palette;

  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);

  const { startSession, recordAnswer, endSession } = useProgress();
  const sessionIdRef = useRef<string>('');
  const startTimeRef = useRef<number>(Date.now());
  const correctCountRef = useRef(0);
  const seenRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    startSession(null).then((id) => {
      sessionIdRef.current = id;
      startTimeRef.current = Date.now();
    });
  }, [startSession]);

  const currentLine = lines[index];
  const pct = ((index + 1) / lines.length) * 100;
  const decoEmoji = DECORATION_EMOJIS[index % DECORATION_EMOJIS.length];

  const markCurrentAsSeen = async () => {
    if (!seenRef.current.has(index) && sessionIdRef.current) {
      seenRef.current.add(index);
      correctCountRef.current += 1;
      await recordAnswer(sessionIdRef.current, true);
    }
  };

  const handleNext = async () => {
    await markCurrentAsSeen();
    if (index < lines.length - 1) {
      setIndex((i) => i + 1);
    } else {
      await endSession(sessionIdRef.current, {
        cardsStudied: lines.length,
        cardsCorrect: correctCountRef.current,
        durationSecs: Math.round((Date.now() - startTimeRef.current) / 1000),
      });
      setDone(true);
    }
  };

  const handleBack = () => {
    if (index > 0) setIndex((i) => i - 1);
  };

  const handleExit = async () => {
    if (sessionIdRef.current) {
      await endSession(sessionIdRef.current, {
        cardsStudied: seenRef.current.size,
        cardsCorrect: correctCountRef.current,
        durationSecs: Math.round((Date.now() - startTimeRef.current) / 1000),
      });
    }
    onExit();
  };

  if (done) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography sx={{ fontSize: '4rem', mb: 2 }}>🎉</Typography>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, color: brand[700] }}>
          よくできました！
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 1 }}>
          You read all {lines.length} lines!
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 4 }}>
          Keep practicing to memorize your speech ✨
        </Typography>
        <Stack direction="row" spacing={2} justifyContent="center">
          <Button variant="outlined" onClick={() => { setIndex(0); setDone(false); seenRef.current = new Set(); correctCountRef.current = 0; }}>
            Read Again
          </Button>
          <Button variant="contained" onClick={onExit}>
            Back to Speech
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box>
      {/* Progress */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            flexGrow: 1,
            height: 8,
            borderRadius: 99,
            bgcolor: alpha(brand[200], 0.3),
            '& .MuiLinearProgress-bar': {
              background: `linear-gradient(90deg, ${brand[300]}, ${accent[400]})`,
              borderRadius: 99,
            },
          }}
        />
        <Typography variant="caption" sx={{ fontWeight: 800, color: brand[600], flexShrink: 0 }}>
          {index + 1} / {lines.length}
        </Typography>
      </Box>

      {/* Main card */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 4,
          border: `2px solid ${alpha(brand[300], 0.45)}`,
          bgcolor: surfaces.input,
          boxShadow: `0 8px 32px ${alpha(brand[300], 0.18)}`,
          p: { xs: 3, sm: 4 },
          mb: 3,
          minHeight: 200,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* Decorative background blob */}
        <Box
          sx={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 160,
            height: 160,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(accent[200], 0.3)}, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />

        {/* Line label */}
        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
          <AutoStoriesIcon sx={{ fontSize: '1rem', color: brand[400] }} />
          <Typography variant="caption" sx={{ color: brand[500], letterSpacing: '0.12em', fontWeight: 800 }}>
            LINE {index + 1}
          </Typography>
          <Typography sx={{ fontSize: '0.9rem' }}>{decoEmoji}</Typography>
        </Stack>

        {/* The actual sentence */}
        <Typography
          sx={{
            fontFamily: '"Noto Serif JP", "Noto Sans JP", serif',
            fontSize: { xs: '1.3rem', sm: '1.6rem' },
            lineHeight: 1.9,
            color: 'text.primary',
            fontWeight: 500,
            flexGrow: 1,
            my: 'auto',
          }}
        >
          {currentLine?.text}
        </Typography>

        {/* Hint */}
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', display: 'block', mt: 2, textAlign: 'right' }}
        >
          Read carefully ✦ tap Next when ready
        </Typography>
      </Box>

      {/* Dot indicators */}
      <Stack direction="row" spacing={0.75} justifyContent="center" mb={3} flexWrap="wrap" useFlexGap>
        {lines.map((_, i) => (
          <Box
            key={i}
            sx={{
              width: i === index ? 20 : 8,
              height: 8,
              borderRadius: 99,
              transition: 'all 0.25s ease',
              bgcolor: seenRef.current.has(i)
                ? brand[400]
                : i === index
                  ? brand[300]
                  : alpha(brand[200], 0.5),
            }}
          />
        ))}
      </Stack>

      {/* Navigation */}
      <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          disabled={index === 0}
          variant="outlined"
          size="small"
        >
          Back
        </Button>

        <Button size="small" color="inherit" onClick={handleExit} sx={{ opacity: 0.45, fontSize: '0.75rem' }}>
          Quit &amp; Save
        </Button>

        <Button
          endIcon={<ArrowForwardIcon />}
          onClick={handleNext}
          variant="contained"
          size="small"
        >
          {index === lines.length - 1 ? 'Finish ✨' : 'Next'}
        </Button>
      </Stack>
    </Box>
  );
}

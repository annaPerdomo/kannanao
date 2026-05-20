'use client';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import { alpha, createTheme, ThemeProvider } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { IndexCard } from '@/components/IndexCard';
import { Loading } from '@/components/Loading';
import { PublicFlashcard } from '@/components/PublicFlashcard';
import { schemeInfo } from '@/contexts/ThemeContext';
import { dbCardToApp } from '@/lib/supabase';
import { type ColorScheme, createAppTheme, themeFonts } from '@/theme';
import type { Flashcard as FlashcardType } from '@/types/flashcard';

// Neutral gray theme for "plain" mode — no color tinting anywhere
const gray: Record<number, string> = {
  50: '#fafafa',
  100: '#f4f4f5',
  200: '#e4e4e7',
  300: '#d4d4d8',
  400: '#a1a1aa',
  500: '#71717a',
  600: '#52525b',
  700: '#3f3f46',
};
const plainTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: gray[500], light: gray[200], dark: gray[700] },
    secondary: { main: gray[400], light: gray[100], dark: gray[600] },
    background: { default: '#ffffff', paper: '#ffffff' },
    text: { primary: '#18181b', secondary: '#52525b' },
    brand: gray as never,
    accent: gray as never,
    surfaces: { glass: gray[50], overlay: gray[50], input: gray[50], chip: gray[100] },
  } as never,
  shape: { borderRadius: 12 },
  fonts: themeFonts.sakura,
  typography: { fontFamily: themeFonts.sakura.primary },
});

interface PublicStudyViewerProps {
  deckId: string;
}

type CardTheme = ColorScheme | 'plain';

const SLIDE_DURATION_MS = 260;
const CARD_W = 480;
const CARD_H = 300;

const THEME_STORAGE_KEY = 'kannanao_embed_theme';
const THEME_CHANNEL_NAME = 'kannanao_embed_theme';

// Murasaki is the default — violet/purple aesthetic has the broadest appeal
// across college students (study vibes, gender-neutral, Gen Z aesthetic)
const DEFAULT_THEME: CardTheme = 'murasaki';

const VALID_THEMES: CardTheme[] = ['sakura', 'murasaki', 'yuki', 'plain'];

const CONFETTI_COLORS = [
  '#F472B6',
  '#C4B5FD',
  '#FCD34D',
  '#67E8F9',
  '#6EE7B7',
  '#FB923C',
  '#A78BFA',
  '#F9A8D4',
];

const SPARKLE_ITEMS = [
  { emoji: '✨', left: 10, delay: 0.04 },
  { emoji: '⭐', left: 24, delay: 0 },
  { emoji: '💫', left: 40, delay: 0.1 },
  { emoji: '✨', left: 57, delay: 0.06 },
  { emoji: '🌟', left: 72, delay: 0.02 },
  { emoji: '⭐', left: 87, delay: 0.12 },
];

function CelebrationOverlay({ cardCount, onReset }: { cardCount: number; onReset: () => void }) {
  useEffect(() => {
    const t = setTimeout(onReset, 3600);
    return () => clearTimeout(t);
  }, [onReset]);

  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        left: `${((i / 28) * 100 + Math.sin(i * 1.9) * 7 + 50) % 100}%`,
        delay: `${(i * 0.11) % 2}s`,
        duration: `${1.8 + (i % 5) * 0.28}s`,
        size: `${9 + (i % 4) * 4}px`,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        round: i % 3 !== 1,
      })),
    [],
  );

  return (
    <Box
      onClick={onReset}
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        bgcolor: 'rgba(10,5,20,0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        animation: 'celebFade 3.6s ease forwards',
        '@keyframes celebFade': {
          '0%': { opacity: 0 },
          '8%': { opacity: 1 },
          '78%': { opacity: 1 },
          '100%': { opacity: 0 },
        },
      }}
    >
      {pieces.map((p) => (
        <Box
          key={p.id}
          sx={{
            position: 'absolute',
            left: p.left,
            top: '-24px',
            width: p.size,
            height: p.size,
            bgcolor: p.color,
            borderRadius: p.round ? '50%' : '2px',
            animation: `confettiFall ${p.duration} ${p.delay} ease-in both`,
            '@keyframes confettiFall': {
              from: { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
              to: { transform: 'translateY(110vh) rotate(600deg)', opacity: 0.2 },
            },
          }}
        />
      ))}
      <Box
        sx={{
          textAlign: 'center',
          px: 4,
          py: 3,
          borderRadius: '28px',
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(16px)',
          border: '1.5px solid rgba(255,255,255,0.22)',
          animation: 'celebPop 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards',
          '@keyframes celebPop': {
            from: { transform: 'scale(0.25) translateY(40px)', opacity: 0 },
            to: { transform: 'scale(1) translateY(0)', opacity: 1 },
          },
        }}
      >
        <Typography sx={{ mt: 1.5, fontSize: '1.7rem', fontWeight: 900, color: '#fff' }}>
          すごい！
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: '0.95rem', color: 'rgba(255,255,255,0.88)' }}>
          You reviewed all <b>{cardCount}</b> cards!
        </Typography>
        <Typography
          sx={{
            mt: 2,
            fontSize: '0.68rem',
            color: 'rgba(255,255,255,0.45)',
            letterSpacing: '0.1em',
            fontFamily: (t) => t.fonts.mono,
          }}
        >
          TAP TO REVIEW AGAIN
        </Typography>
      </Box>
    </Box>
  );
}

export default function PublicStudyViewer({ deckId }: PublicStudyViewerProps) {
  const [cards, setCards] = useState<FlashcardType[]>([]);
  const [deckName, setDeckName] = useState('Flashcards');
  const [deckEmoji, setDeckEmoji] = useState('📘');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [navigating, setNavigating] = useState(false);
  const [navDir, setNavDir] = useState<1 | -1>(1);
  const [showCelebration, setShowCelebration] = useState(false);

  // Analytics — one stable session ID per mount, never null
  const sessionIdRef = useRef<string>(
    typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).slice(2),
  );
  const activeTimeRef = useRef({ elapsed: 0, lastVisible: Date.now() });
  const viewFiredRef = useRef(false);

  const trackEvent = useCallback(
    (
      eventType: 'view' | 'card_flip' | 'deck_complete' | 'session_end',
      extra?: { cardIndex?: number; durationSeconds?: number },
    ) => {
      const payload = JSON.stringify({
        deckId,
        sessionId: sessionIdRef.current,
        eventType,
        referrer: typeof document !== 'undefined' ? document.referrer.substring(0, 500) : undefined,
        ...extra,
      });

      // sendBeacon survives page unload; use it for session_end
      if (eventType === 'session_end' && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(
          '/api/analytics/embed',
          new Blob([payload], { type: 'application/json' }),
        );
      } else {
        fetch('/api/analytics/embed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {
          /* never break the embed */
        });
      }
    },
    [deckId],
  );

  const [cardTheme, setCardTheme] = useState<CardTheme>(() => {
    if (typeof window === 'undefined') return DEFAULT_THEME;
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as CardTheme | null;
    return saved && VALID_THEMES.includes(saved) ? saved : DEFAULT_THEME;
  });

  // BroadcastChannel: sync theme across all open embeds on the same origin
  const broadcastRef = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    broadcastRef.current = new BroadcastChannel(THEME_CHANNEL_NAME);
    broadcastRef.current.onmessage = (e) => {
      const theme = e.data as CardTheme;
      if (VALID_THEMES.includes(theme)) {
        setCardTheme(theme);
        localStorage.setItem(THEME_STORAGE_KEY, theme);
      }
    };
    return () => broadcastRef.current?.close();
  }, []);

  const handleThemeChange = useCallback((theme: CardTheme) => {
    setCardTheme(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    broadcastRef.current?.postMessage(theme);
  }, []);

  // MUI theme for the selected scheme — plain falls back to sakura for chrome colors
  const muiTheme = useMemo(
    () => (cardTheme === 'plain' ? plainTheme : createAppTheme(cardTheme)),
    [cardTheme],
  );

  useEffect(() => {
    fetch(`/api/public/deck/${deckId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setDeckName(data.deck.name);
        setDeckEmoji(data.deck.emoji ?? '📘');
        setCards(data.cards.map(dbCardToApp));
      })
      .catch(() => setError('Failed to load deck'))
      .finally(() => setLoading(false));
  }, [deckId]);

  // Fire "view" once when the deck finishes loading successfully
  useEffect(() => {
    if (!loading && cards.length > 0 && !viewFiredRef.current) {
      viewFiredRef.current = true;
      activeTimeRef.current = { elapsed: 0, lastVisible: Date.now() };
      trackEvent('view');
    }
  }, [loading, cards.length, trackEvent]);

  // Track active (visible) time only — pauses when tab is hidden so stale tabs
  // don't inflate duration.
  const sessionEndFiredRef = useRef(false);

  const getActiveSeconds = useCallback(() => {
    const at = activeTimeRef.current;
    const pending =
      typeof document !== 'undefined' && !document.hidden ? Date.now() - at.lastVisible : 0;
    return Math.round((at.elapsed + pending) / 1000);
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => {
      const at = activeTimeRef.current;
      if (document.hidden) {
        // Tab became hidden — bank the elapsed time
        at.elapsed += Date.now() - at.lastVisible;
      } else {
        // Tab became visible — start a new active span
        at.lastVisible = Date.now();
      }
    };

    const fireSessionEnd = () => {
      if (sessionEndFiredRef.current || !viewFiredRef.current) return;
      sessionEndFiredRef.current = true;
      trackEvent('session_end', { durationSeconds: getActiveSeconds() });
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', fireSessionEnd);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', fireSessionEnd);
      fireSessionEnd();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigate = useCallback(
    (direction: 1 | -1) => {
      if (navigating) return;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= cards.length) return;
      setNavDir(direction);
      setNavigating(true);
      trackEvent('card_flip', { cardIndex: nextIndex });
      setTimeout(() => {
        setIndex(nextIndex);
        setNavigating(false);
      }, SLIDE_DURATION_MS);
    },
    [navigating, index, cards.length, trackEvent],
  );

  const triggerCelebration = useCallback(() => {
    trackEvent('deck_complete');
    setShowCelebration(true);
  }, [trackEvent]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        if (index === cards.length - 1) {
          triggerCelebration();
        } else {
          navigate(1);
        }
      } else if (e.key === 'ArrowLeft') {
        navigate(-1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, triggerCelebration, index, cards.length]);

  const handleReset = useCallback(() => {
    setShowCelebration(false);
    setIndex(0);
  }, []);

  if (loading)
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <Loading message="Loading cards…" />
      </Box>
    );

  if (error)
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 300,
          p: 4,
        }}
      >
        <Typography color="text.secondary" sx={{ fontSize: '0.9rem' }}>
          This deck is not available for embedding.
        </Typography>
      </Box>
    );

  if (cards.length === 0)
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 300,
          p: 4,
        }}
      >
        <Typography color="text.secondary" sx={{ fontSize: '0.9rem' }}>
          No cards in this deck yet.
        </Typography>
      </Box>
    );

  const card = cards[index];

  return (
    <ThemeProvider theme={muiTheme}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100dvh',
          overflow: 'hidden',
          bgcolor: 'background.default',
          px: 2,
          pt: 2,
          pb: 1.5,
        }}
      >
        {/* Header: deck title + theme toggle */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 1.25,
            flexShrink: 0,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: '1rem' }}>{deckEmoji}</Typography>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: '0.95rem',
                color: 'text.primary',
                lineHeight: 1,
              }}
            >
              {deckName}
            </Typography>
          </Box>

          {/* Theme selector */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {(['sakura', 'murasaki', 'yuki'] as ColorScheme[]).map((scheme) => (
              <Box
                key={scheme}
                component="span"
                onClick={() => handleThemeChange(scheme)}
                sx={(t) => ({
                  px: 1.1,
                  py: 0.35,
                  borderRadius: '6px',
                  border:
                    cardTheme === scheme
                      ? `1.5px solid ${t.palette.brand[500]}`
                      : `1.5px solid ${alpha(t.palette.brand[300], 0.4)}`,
                  bgcolor: cardTheme === scheme ? alpha(t.palette.brand[300], 0.18) : 'transparent',
                  color: cardTheme === scheme ? t.palette.brand[700] : '#aaa',
                  cursor: 'pointer',
                  fontSize: '0.65rem',
                  fontFamily: (t) => t.fonts.mono,
                  letterSpacing: '0.05em',
                  fontWeight: cardTheme === scheme ? 700 : 400,
                  transition: 'all 0.18s ease',
                  userSelect: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                })}
              >
                {schemeInfo[scheme].emoji} {schemeInfo[scheme].label}
              </Box>
            ))}
            <Box
              component="span"
              onClick={() => handleThemeChange('plain')}
              sx={(t) => ({
                px: 1.1,
                py: 0.35,
                borderRadius: '6px',
                border:
                  cardTheme === 'plain'
                    ? `1.5px solid ${t.palette.brand[500]}`
                    : `1.5px solid ${alpha(t.palette.brand[300], 0.4)}`,
                bgcolor: cardTheme === 'plain' ? alpha(t.palette.brand[300], 0.18) : 'transparent',
                color: cardTheme === 'plain' ? t.palette.brand[700] : '#aaa',
                cursor: 'pointer',
                fontSize: '0.65rem',
                fontFamily: (t) => t.fonts.mono,
                letterSpacing: '0.05em',
                fontWeight: cardTheme === 'plain' ? 700 : 400,
                transition: 'all 0.18s ease',
                userSelect: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              })}
            >
              ◻ Plain
            </Box>
          </Box>
        </Box>

        {/* Progress bar */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5, flexShrink: 0 }}>
          <LinearProgress
            variant="determinate"
            value={((index + 1) / cards.length) * 100}
            sx={(t) => ({
              flexGrow: 1,
              height: 5,
              borderRadius: 99,
              bgcolor: alpha(t.palette.brand[300], 0.18),
              '& .MuiLinearProgress-bar': {
                borderRadius: 99,
                background: `linear-gradient(90deg, ${t.palette.brand[200]} 0%, ${t.palette.brand[400]} 50%, ${t.palette.accent[300]} 100%)`,
              },
            })}
          />
          <Chip
            label={`${index + 1} / ${cards.length}`}
            size="small"
            sx={(t) => ({
              bgcolor: alpha(t.palette.brand[300], 0.18),
              color: t.palette.brand[700],
              fontWeight: 600,
              border: `1px solid ${alpha(t.palette.brand[300], 0.4)}`,
              height: 22,
              fontSize: '0.72rem',
            })}
          />
        </Box>

        {/* Card + Navigation grouped together, centered in remaining space */}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Card */}
          <Box
            key={index}
            sx={{
              width: CARD_W,
              height: CARD_H,
              flexShrink: 0,
              position: 'relative',
              transformOrigin: 'top center',
              maxWidth: '100%',
              '@keyframes dealIn': {
                '0%': {
                  transform: 'translateY(-70px) rotateX(-38deg) rotateZ(3deg) scale(0.85)',
                  opacity: 0,
                },
                '55%': { opacity: 1 },
                '100%': {
                  transform: 'translateY(0) rotateX(0deg) rotateZ(0deg) scale(1)',
                  opacity: 1,
                },
              },
              '@keyframes dealInBack': {
                '0%': {
                  transform: 'translateY(-70px) rotateX(-38deg) rotateZ(-3deg) scale(0.85)',
                  opacity: 0,
                },
                '55%': { opacity: 1 },
                '100%': {
                  transform: 'translateY(0) rotateX(0deg) rotateZ(0deg) scale(1)',
                  opacity: 1,
                },
              },
              '@keyframes sparkleUp': {
                from: { transform: 'translateY(0) scale(1)', opacity: 0.9 },
                to: { transform: 'translateY(-56px) scale(0)', opacity: 0 },
              },
              perspective: '1000px',
              ...(navigating
                ? {
                    transform: 'translateY(24px) rotateX(10deg) scale(0.92)',
                    opacity: 0,
                    transition: `transform ${SLIDE_DURATION_MS}ms ease-in, opacity ${SLIDE_DURATION_MS}ms ease-in`,
                    pointerEvents: 'none',
                  }
                : {
                    animation: `${navDir === 1 ? 'dealIn' : 'dealInBack'} 0.48s cubic-bezier(0.22,1,0.36,1)`,
                  }),
            }}
          >
            {card && cardTheme !== 'plain' && (
              <PublicFlashcard card={card} width={CARD_W} height={CARD_H} />
            )}
            {card && cardTheme === 'plain' && (
              <IndexCard card={card} width={CARD_W} height={CARD_H} />
            )}
            {/* Sparkles: only for themed cards */}
            {cardTheme !== 'plain' &&
              !navigating &&
              SPARKLE_ITEMS.map((s, i) => (
                <Box
                  key={i}
                  sx={{
                    position: 'absolute',
                    bottom: 12,
                    left: `${s.left}%`,
                    fontSize: '0.85rem',
                    pointerEvents: 'none',
                    animation: `sparkleUp 0.72s ${s.delay}s ease-out both`,
                  }}
                >
                  {s.emoji}
                </Box>
              ))}
          </Box>

          {/* Navigation — directly below card */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              mt: 2.5,
            }}
          >
            <IconButton
              onClick={() => navigate(-1)}
              disabled={index === 0 || navigating}
              size="small"
              sx={(t) => ({
                border: `1px solid ${alpha(t.palette.brand[300], 0.45)}`,
                bgcolor: t.palette.brand[50],
                '&:not(:disabled):hover': { borderColor: t.palette.brand[500] },
              })}
            >
              <ArrowBackIcon fontSize="small" />
            </IconButton>
            <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: '0.08em' }}>
              {cardTheme !== 'plain' ? 'TAP CARD TO FLIP' : 'CLICK CARD TO FLIP'}
            </Typography>
            <IconButton
              onClick={() => (index === cards.length - 1 ? triggerCelebration() : navigate(1))}
              disabled={navigating}
              size="small"
              sx={(t) => ({
                border: `1px solid ${alpha(t.palette.brand[300], 0.45)}`,
                bgcolor: t.palette.brand[50],
                '&:not(:disabled):hover': { borderColor: t.palette.brand[500] },
              })}
            >
              <ArrowForwardIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Branding: Powered by Kannanao first, then Made by Variations on a String */}
        <Box
          sx={{
            mt: 1,
            pb: 0.25,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0.25,
            flexShrink: 0,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography
              sx={{
                fontSize: '0.6rem',
                color: 'text.disabled',
                fontFamily: (t) => t.fonts.mono,
                letterSpacing: '0.06em',
              }}
            >
              Powered by
            </Typography>
            <Typography
              component="a"
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                fontSize: '0.6rem',
                color: 'primary.main',
                fontFamily: (t) => t.fonts.mono,
                letterSpacing: '0.06em',
                textDecoration: 'none',
                fontWeight: 700,
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              Kannanao
            </Typography>
          </Box>
          <Typography
            component="a"
            href="https://www.variationsonastring.com"
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              fontSize: '0.62rem',
              color: 'text.disabled',
              fontFamily: (t) => t.fonts.mono,
              letterSpacing: '0.06em',
              textDecoration: 'none',
              '&:hover': { color: 'text.secondary', textDecoration: 'underline' },
            }}
          >
            Made by Variations on a String
          </Typography>
        </Box>

        {showCelebration && <CelebrationOverlay cardCount={cards.length} onReset={handleReset} />}
      </Box>
    </ThemeProvider>
  );
}

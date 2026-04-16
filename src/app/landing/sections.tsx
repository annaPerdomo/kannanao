'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ThemeProvider, alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import { Flashcard } from '@/components/Flashcard';
import { EmbedFlashcard } from '@/components/EmbedFlashcard';
import { ImageCard } from '@/components/ImageCard';
import { Loading } from '@/components/Loading';
import type { Flashcard as FlashcardType } from '@/types/flashcard';
import { createAppTheme, pink, purple, sky, emerald, amber, macChrome, darkPurple } from '@/theme';
import WaitlistForm from '@/components/WaitlistForm';
import { useAuth } from '@/contexts/AuthContext';

// ─── Theme instances ──────────────────────────────────────────────────────────

const sakuraTheme = createAppTheme('sakura');
const murasakiTheme = createAppTheme('murasaki');

// ─── Demo flashcard data ──────────────────────────────────────────────────────

const SAKURA_CARD: FlashcardType = {
  id: 'demo-sakura',
  word: '桜',
  reading: 'さくら',
  meaning: 'cherry blossom',
  image_query: 'cherry blossom japan',
  imageUrl: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=600&q=80',
  example_jp: '{桜|さくら}の{花|はな}が{綺麗|きれい}に{咲|さ}いています。',
  example_en: 'The cherry blossoms are blooming beautifully.',
  deckId: 'demo',
  mainViewMode: 'kanji',
  cardType: 'word',
  jlptLevel: 'N5',
};

const YUME_CARD: FlashcardType = {
  id: 'demo-yume',
  word: '夢',
  reading: 'ゆめ',
  meaning: 'dream',
  image_query: 'dream clouds stars night',
  example_jp: '{昨夜|さくや}{素晴|すば}らしい{夢|ゆめ}を{見|み}ました。',
  example_en: 'I had a wonderful dream last night.',
  deckId: 'demo',
  mainViewMode: 'kanji',
  cardType: 'word',
  jlptLevel: 'N4',
};

// ─── useInView hook (bidirectional — fires on both scroll-in and scroll-out) ──

function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { setInView(e.isIntersecting); },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ─── Ambient sakura fall ──────────────────────────────────────────────────────

const FALL_PETALS = [
  { id: 0,  left: '4%',  size: 14, dur: 10.5, delay: 0,   anim: 'sakuraFall-l', opacity: 0.50 },
  { id: 1,  left: '12%', size: 11, dur: 12.0, delay: 1.8, anim: 'sakuraFall-r', opacity: 0.40 },
  { id: 2,  left: '21%', size: 16, dur: 9.2,  delay: 3.5, anim: 'sakuraFall-c', opacity: 0.55 },
  { id: 3,  left: '30%', size: 12, dur: 11.5, delay: 0.7, anim: 'sakuraFall-l', opacity: 0.45 },
  { id: 4,  left: '39%', size: 15, dur: 10.0, delay: 4.2, anim: 'sakuraFall-r', opacity: 0.50 },
  { id: 5,  left: '48%', size: 11, dur: 13.0, delay: 2.1, anim: 'sakuraFall-c', opacity: 0.38 },
  { id: 6,  left: '56%', size: 15, dur: 9.8,  delay: 5.5, anim: 'sakuraFall-l', opacity: 0.48 },
  { id: 7,  left: '64%', size: 13, dur: 11.2, delay: 1.3, anim: 'sakuraFall-r', opacity: 0.52 },
  { id: 8,  left: '72%', size: 17, dur: 10.5, delay: 3.0, anim: 'sakuraFall-c', opacity: 0.42 },
  { id: 9,  left: '80%', size: 12, dur: 12.5, delay: 6.0, anim: 'sakuraFall-l', opacity: 0.46 },
  { id: 10, left: '88%', size: 14, dur: 9.5,  delay: 2.8, anim: 'sakuraFall-r', opacity: 0.50 },
  { id: 11, left: '95%', size: 11, dur: 11.8, delay: 4.8, anim: 'sakuraFall-c', opacity: 0.38 },
  { id: 12, left: '17%', size: 13, dur: 10.2, delay: 7.5, anim: 'sakuraFall-r', opacity: 0.44 },
  { id: 13, left: '43%', size: 15, dur: 11.0, delay: 8.2, anim: 'sakuraFall-l', opacity: 0.50 },
  { id: 14, left: '69%', size: 12, dur: 9.0,  delay: 7.0, anim: 'sakuraFall-c', opacity: 0.42 },
];

function SakuraFallEffect() {
  return (
    <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
      {FALL_PETALS.map(p => (
        <Box key={p.id} component="span" sx={{
          position: 'absolute', top: '-60px', left: p.left,
          fontSize: `${p.size}px`, lineHeight: 1,
          opacity: p.opacity, display: 'block', userSelect: 'none',
          animation: `${p.anim} ${p.dur}s ${p.delay}s ease-in-out infinite`,
          willChange: 'transform, opacity',
        }}>
          🌸
        </Box>
      ))}
    </Box>
  );
}

// ─── Decorative glow blob ─────────────────────────────────────────────────────

function Blob({
  color, size, top, left, right, bottom, opacity = 0.3, blur = 70, pulse = false,
}: {
  color: string; size: number; top?: string | number; left?: string | number;
  right?: string | number; bottom?: string | number; opacity?: number; blur?: number; pulse?: boolean;
}) {
  return (
    <Box sx={{
      position: 'absolute', width: size, height: size, borderRadius: '50%',
      background: color, opacity, filter: `blur(${blur}px)`,
      top, left, right, bottom, pointerEvents: 'none',
      ...(pulse ? {
        '@keyframes blobPulse': {
          '0%,100%': { transform: 'scale(1)', opacity },
          '50%': { transform: 'scale(1.14)', opacity: Math.min(opacity * 1.5, 0.9) },
        },
        animation: 'blobPulse 7s ease-in-out infinite',
      } : {}),
    }} />
  );
}

// ─── Section 1: Hero (Sakura) ─────────────────────────────────────────────────

export function HeroSection() {
  const router = useRouter();
  const { session } = useAuth();
  const { ref, inView } = useInView(0.05);

  return (
    <Box ref={ref} sx={{
      minHeight: '100vh',
      position: 'relative', overflow: 'hidden',
      background: `linear-gradient(148deg, ${pink[50]} 0%, ${pink[100]} 30%, ${alpha(pink[50], 0.6)} 60%, ${pink[50]} 100%)`,
      display: 'flex', alignItems: 'center',
      pt: { xs: 14, md: 12 }, pb: { xs: 10, md: 10 },
      px: { xs: 2, sm: 4, md: 6, lg: 8 },
      '@keyframes floatCard': {
        '0%,100%': { transform: 'translateY(0px) rotate(-1.5deg)' },
        '50%': { transform: 'translateY(-18px) rotate(0.8deg)' },
      },
      '@keyframes scrollBounce': {
        '0%,100%': { transform: 'translateX(-50%) translateY(0)' },
        '50%': { transform: 'translateX(-50%) translateY(10px)' },
      },
    }}>
      {/* Ambient sakura fall — lives inside the hero overflow:hidden */}
      <SakuraFallEffect />

      <Blob color={pink[300]} size={560} top="-120px" right="-100px" opacity={0.22} blur={90} pulse />
      <Blob color={purple[300]} size={380} bottom="-40px" left="-70px" opacity={0.18} blur={80} />
      <Blob color={pink[200]} size={260} top="35%" right="18%" opacity={0.28} blur={55} />

      {/* Subtle dot pattern */}
      <Box sx={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `radial-gradient(circle, ${alpha(pink[400], 0.1)} 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
        zIndex: 0,
      }} />

      {/* Decorative background kanji */}
      {([
        { char: '桜', size: 160, top: '6%',   left: '-1%',  opacity: 0.065, delay: '0s'   },
        { char: '春', size: 200, top: '48%',  right: '-2%', opacity: 0.050, delay: '1.8s' },
        { char: '花', size: 110, bottom: '10%', left: '9%', opacity: 0.075, delay: '2.5s' },
        { char: '語', size: 140, top: '18%',  left: '52%',  opacity: 0.045, delay: '1.0s' },
      ] as Array<{ char: string; size: number; top?: string; bottom?: string; left?: string; right?: string; opacity: number; delay: string }>).map(({ char, size, top, bottom, left, right, opacity, delay }) => (
        <Box key={char} sx={{
          position: 'absolute',
          fontFamily: '"Noto Serif JP", serif',
          fontSize: size, color: pink[400], opacity,
          top, bottom, left, right,
          pointerEvents: 'none', userSelect: 'none', lineHeight: 1,
          animation: 'floatKanji 9s ease-in-out infinite',
          animationDelay: delay,
          zIndex: 0,
        }}>
          {char}
        </Box>
      ))}

      <Box sx={{
        maxWidth: 1220, mx: 'auto', width: '100%',
        display: 'flex', flexDirection: { xs: 'column', lg: 'row' },
        alignItems: 'center', gap: { xs: 7, lg: 10 },
        position: 'relative', zIndex: 1,
      }}>
        {/* ── Left: text ── */}
        <Box sx={{
          flex: 1, textAlign: { xs: 'center', lg: 'left' },
          opacity: inView ? 1 : 0,
          transform: inView ? 'translateX(0)' : 'translateX(-48px)',
          transition: 'opacity 0.9s cubic-bezier(0.16,1,0.3,1), transform 0.9s cubic-bezier(0.16,1,0.3,1)',
        }}>
          <Chip
            icon={<AutoAwesomeIcon sx={{ fontSize: '0.85rem !important', color: `${amber[700]} !important` }} />}
            label="✨ Closed beta — join the waitlist"
            size="small"
            sx={{
              mb: 3, bgcolor: alpha(amber[400], 0.12), color: amber[700],
              fontWeight: 700, fontSize: '0.72rem',
              border: `1px solid ${alpha(amber[400], 0.35)}`, borderRadius: 6,
            }}
          />

          <Typography component="h1" sx={{
            fontFamily: '"DM Serif Display", serif',
            fontSize: { xs: '3.4rem', sm: '4.2rem', lg: '5.2rem' },
            lineHeight: 0.98, mb: 2.5,
            background: `linear-gradient(135deg, ${pink[600]} 0%, ${purple[500]} 50%, ${sky[500]} 100%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            Learn Japanese,<br />one card<br />at a time.
          </Typography>

          <Typography sx={{
            fontSize: { xs: '1rem', sm: '1.15rem' },
            color: alpha(pink[700], 0.72), lineHeight: 1.8,
            mb: 4, maxWidth: 520, mx: { xs: 'auto', lg: 0 },
          }}>
            Kannanao is a beautiful flashcard studio with AI card generation,
            gamified progress tracking, and multiple practice modes — designed to
            make studying Japanese <em>actually</em> enjoyable.
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}
            justifyContent={{ xs: 'center', lg: 'flex-start' }} sx={{ mb: 3.5 }}>
            {session ? (
              <Button variant="contained" size="large" onClick={() => router.push('/')}
                sx={{ fontFamily: '"DM Serif Display", serif', fontSize: '1.05rem', textTransform: 'none', borderRadius: 8, px: 4, py: 1.5,
                  background: `linear-gradient(135deg, ${pink[400]} 0%, ${pink[600]} 100%)`,
                  boxShadow: `0 8px 28px ${alpha(pink[500], 0.42)}`,
                  '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 14px 40px ${alpha(pink[500], 0.52)}` },
                }}>
                Go to dashboard 🌸
              </Button>
            ) : (
              <>
                <Button variant="contained" size="large"
                  onClick={() => document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })}
                  sx={{ fontFamily: '"DM Serif Display", serif', fontSize: '1.05rem', textTransform: 'none', borderRadius: 8, px: 4, py: 1.5,
                    background: `linear-gradient(135deg, ${pink[400]} 0%, ${pink[600]} 100%)`,
                    boxShadow: `0 8px 28px ${alpha(pink[500], 0.42)}`,
                    '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 14px 40px ${alpha(pink[500], 0.52)}` },
                  }}>
                  Join the waitlist 🌸
                </Button>
                <Button variant="outlined" size="large" onClick={() => router.push('/login')}
                  sx={{ fontFamily: '"DM Serif Display", serif', fontSize: '1.05rem', textTransform: 'none', borderRadius: 8, px: 3.5, py: 1.5,
                    borderColor: alpha(pink[400], 0.6), color: pink[700],
                    '&:hover': { borderColor: pink[500], bgcolor: alpha(pink[100], 0.6) },
                  }}>
                  Sign in
                </Button>
              </>
            )}
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap
            justifyContent={{ xs: 'center', lg: 'flex-start' }}>
            {['🎌 Japanese', '🤖 AI-powered', '🎮 Gamified', '📊 Stats', '📄 PDF Import'].map(tag => (
              <Chip key={tag} label={tag} size="small" sx={{
                bgcolor: alpha(pink[50], 0.95), color: pink[700], fontSize: '0.72rem',
                border: `1px solid ${alpha(pink[300], 0.55)}`, borderRadius: 4,
              }} />
            ))}
          </Stack>
        </Box>

        {/* ── Right: real Flashcard ── */}
        <Box sx={{
          flex: '0 0 auto', width: { xs: '100%', sm: 390, lg: 430 },
          position: 'relative',
          opacity: inView ? 1 : 0,
          transform: inView ? 'translateX(0)' : 'translateX(48px)',
          transition: 'opacity 0.9s cubic-bezier(0.16,1,0.3,1) 0.18s, transform 0.9s cubic-bezier(0.16,1,0.3,1) 0.18s',
        }}>
          <Box sx={{
            position: 'absolute', inset: '8% 4%', borderRadius: 8,
            background: `radial-gradient(ellipse at center, ${alpha(pink[400], 0.38)} 0%, transparent 70%)`,
            filter: 'blur(36px)', pointerEvents: 'none',
          }} />
          <Box sx={{ animation: 'floatCard 7s ease-in-out infinite', position: 'relative' }}>
            <ThemeProvider theme={sakuraTheme}>
              <Flashcard card={SAKURA_CARD} height={450} />
            </ThemeProvider>
          </Box>
        </Box>
      </Box>

      {/* Scroll indicator */}
      <Box sx={{
        position: 'absolute', bottom: 28, left: '50%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75,
        animation: 'scrollBounce 2.2s ease-in-out infinite',
        opacity: 0.5, pointerEvents: 'none',
      }}>
        <Typography sx={{ fontSize: '0.6rem', letterSpacing: '0.22em', color: pink[600], textTransform: 'uppercase' }}>scroll</Typography>
        <Box sx={{ width: 1.5, height: 36, background: `linear-gradient(180deg, ${pink[500]}, transparent)`, borderRadius: 2 }} />
      </Box>
    </Box>
  );
}

// ─── Section 2: Features (Murasaki — dark) ────────────────────────────────────

const FEATURES = [
  { emoji: '🤖', title: 'AI Card Generation',  desc: 'Type a word — Google Gemini fills readings, meanings, and bilingual example sentences instantly.' },
  { emoji: '🖼️', title: 'Beautiful Images',     desc: 'Every card gets a stunning Unsplash photo. Visual memory is the fastest memory.' },
  { emoji: '🎮', title: 'Three Practice Modes', desc: 'Match, Fill-in-the-blank, and Recall. Every session tracks accuracy and awards XP.' },
  { emoji: '🔥', title: 'Streaks & Levels',     desc: 'Daily study streaks, XP levels, and achievement badges keep you motivated.' },
  { emoji: '📄', title: 'PDF Import',           desc: 'Upload a textbook or word list PDF — Kannanao extracts and builds flashcards for you.' },
  { emoji: '🤝', title: 'Share Decks',          desc: 'Share any deck with a single link. Embed interactive cards on any website.' },
  { emoji: '📊', title: 'Detailed Stats',        desc: 'Activity calendar, per-session accuracy charts, XP history, and achievement badges.' },
  { emoji: '🎌', title: 'Furigana Support',      desc: 'Full furigana rendering in examples — perfect for learners at every JLPT level.' },
];

export function FeaturesSection() {
  const { ref, inView } = useInView(0.08);

  return (
    <Box ref={ref} sx={{
      minHeight: '100vh',
      position: 'relative', overflow: 'hidden',
      background: `linear-gradient(160deg, ${darkPurple.base} 0%, ${darkPurple.mid} 40%, ${darkPurple.deeper} 75%, ${darkPurple.deepest} 100%)`,
      display: 'flex', alignItems: 'center',
      py: { xs: 10, md: 8 },
      px: { xs: 2, sm: 4, md: 6, lg: 8 },
    }}>
      <Blob color={purple[600]} size={640} top="-160px" left="-120px" opacity={0.18} blur={110} pulse />
      <Blob color={pink[500]} size={420} bottom="-80px" right="-80px" opacity={0.14} blur={90} />
      <Blob color={sky[500]} size={300} top="45%" left="55%" opacity={0.09} blur={80} />

      {/* Star-field dots */}
      <Box sx={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `radial-gradient(circle, ${alpha('#fff', 0.055)} 1px, transparent 1px)`,
        backgroundSize: '46px 46px',
      }} />

      <Box sx={{ maxWidth: 1220, mx: 'auto', width: '100%', position: 'relative', zIndex: 1 }}>
        <Box sx={{
          textAlign: 'center', mb: { xs: 6, md: 8 },
          opacity: inView ? 1 : 0, transform: inView ? 'translateY(0)' : 'translateY(32px)',
          transition: 'opacity 0.8s ease, transform 0.8s ease',
        }}>
          <Typography sx={{
            fontFamily: '"DM Serif Display", serif',
            fontSize: { xs: '2.2rem', sm: '3rem', md: '3.8rem' },
            color: 'white', mb: 1.5, lineHeight: 1.05,
          }}>
            Everything you need<br />to study smarter
          </Typography>
          <Typography sx={{ fontSize: '1rem', color: alpha('#fff', 0.5), maxWidth: 500, mx: 'auto', lineHeight: 1.7 }}>
            From AI card generation to detailed analytics — all the tools to build
            a consistent Japanese study habit.
          </Typography>
        </Box>

        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
        }}>
          {FEATURES.map((f, i) => (
            <Paper key={f.title} elevation={0}
              sx={{
                p: 3, borderRadius: 4,
                background: alpha('#fff', 0.05),
                border: `1px solid ${alpha('#fff', 0.09)}`,
                backdropFilter: 'blur(14px)',
                display: 'flex', flexDirection: 'column', gap: 1.5,
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(32px)',
                transition: `opacity 0.65s ease ${0.06 * i}s, transform 0.65s ease ${0.06 * i}s`,
                '&:hover': {
                  background: alpha('#fff', 0.09),
                  border: `1px solid ${alpha(purple[400], 0.45)}`,
                  boxShadow: `0 8px 36px ${alpha(purple[600], 0.3)}`,
                  transform: 'translateY(-5px) !important',
                  transition: 'all 0.25s ease !important',
                },
              }}
            >
              <Typography sx={{ fontSize: '2rem', lineHeight: 1 }}>{f.emoji}</Typography>
              <Typography sx={{ fontFamily: '"DM Serif Display", serif', fontSize: '1.02rem', color: alpha(purple[200], 0.95), lineHeight: 1.2 }}>
                {f.title}
              </Typography>
              <Typography sx={{ fontSize: '0.82rem', color: alpha('#fff', 0.48), lineHeight: 1.65 }}>
                {f.desc}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

// ─── Section 3: AI card generation demo ──────────────────────────────────────

const DEMO_WORDS = ['cherry blossom', '夢', 'beautiful', '月', 'voyage'];

const DEMO_REVIEW_CARDS = [
  { word: '桜',    reading: 'さくら',     meaning: 'cherry blossom', jlpt: 'N5' },
  { word: '夢',    reading: 'ゆめ',       meaning: 'dream',          jlpt: 'N4' },
  { word: '美しい', reading: 'うつくしい', meaning: 'beautiful',      jlpt: 'N3' },
  { word: '月',    reading: 'つき',       meaning: 'moon',           jlpt: 'N5' },
  { word: '旅',    reading: 'たび',       meaning: 'journey',        jlpt: 'N4' },
];

const DEMO_IMAGE_CARDS: FlashcardType[] = [
  {
    id: 'img-1', word: '桜', reading: 'さくら', meaning: 'cherry blossom',
    image_query: 'cherry blossom',
    imageUrl: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=400&q=80',
    example_jp: '{桜|さくら}が{美|うつく}しく{咲|さ}いています。',
    example_en: 'The cherry blossoms are blooming beautifully.',
    deckId: 'demo', mainViewMode: 'kanji', cardType: 'word', jlptLevel: 'N5',
  },
  {
    id: 'img-2', word: '夢', reading: 'ゆめ', meaning: 'dream',
    image_query: 'dream stars galaxy',
    imageUrl: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?auto=format&fit=crop&w=400&q=80',
    example_jp: '{素晴|すば}らしい{夢|ゆめ}を{見|み}た。',
    example_en: 'I had a wonderful dream.',
    deckId: 'demo', mainViewMode: 'kanji', cardType: 'word', jlptLevel: 'N4',
  },
  {
    id: 'img-3', word: '美しい', reading: 'うつくしい', meaning: 'beautiful',
    image_query: 'beautiful japan landscape',
    imageUrl: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&w=400&q=80',
    example_jp: '{景色|けしき}が{本当|ほんとう}に{美|うつく}しい。',
    example_en: 'The scenery is truly beautiful.',
    deckId: 'demo', mainViewMode: 'kanji', cardType: 'word', jlptLevel: 'N3',
  },
  {
    id: 'img-4', word: '月', reading: 'つき', meaning: 'moon',
    image_query: 'full moon night',
    imageUrl: 'https://images.unsplash.com/photo-1532693322450-2cb5c511067d?auto=format&fit=crop&w=400&q=80',
    example_jp: '今夜の{月|つき}は{丸|まる}くて{明|あか}るい。',
    example_en: "Tonight's moon is round and bright.",
    deckId: 'demo', mainViewMode: 'kanji', cardType: 'word', jlptLevel: 'N5',
  },
  {
    id: 'img-5', word: '旅', reading: 'たび', meaning: 'journey',
    image_query: 'travel japan journey',
    imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=400&q=80',
    example_jp: '{長|なが}い{旅|たび}が{始|はじ}まります。',
    example_en: 'A long journey begins.',
    deckId: 'demo', mainViewMode: 'kanji', cardType: 'word', jlptLevel: 'N4',
  },
];

type DemoPhase = 'input' | 'generating' | 'reviewing' | 'cards';

export function AiDemoSection() {
  const { ref, inView } = useInView(0.06);
  const [chipsShown, setChipsShown] = useState(0);
  const [wordsState, setWordsState] = useState<'idle' | 'generating' | 'done'>('idle');
  const [reviewFilled, setReviewFilled] = useState(0);
  const [cardsVisible, setCardsVisible] = useState(0);
  const [phase, setPhase] = useState<DemoPhase>('input');

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    const T: ReturnType<typeof setTimeout>[] = [];

    setChipsShown(0); setWordsState('idle');
    setReviewFilled(0); setCardsVisible(0); setPhase('input');

    let count = 0;
    const chipTimer = setInterval(() => {
      if (cancelled) { clearInterval(chipTimer); return; }
      count++;
      setChipsShown(count);
      if (count >= DEMO_WORDS.length) clearInterval(chipTimer);
    }, 600);

    T.push(setTimeout(() => { if (!cancelled) setWordsState('generating'); }, 3800));
    T.push(setTimeout(() => {
      if (!cancelled) {
        setWordsState('done');
        setPhase('reviewing');
        DEMO_REVIEW_CARDS.forEach((_, i) => {
          T.push(setTimeout(() => { if (!cancelled) setReviewFilled(i + 1); }, i * 280));
        });
      }
    }, 7000));

    T.push(setTimeout(() => {
      if (cancelled) return;
      setPhase('cards');
      DEMO_IMAGE_CARDS.forEach((_, i) => {
        T.push(setTimeout(() => { if (!cancelled) setCardsVisible(i + 1); }, i * 350));
      });
    }, 10500));

    return () => { cancelled = true; clearInterval(chipTimer); T.forEach(clearTimeout); };
  }, [inView]);

  const allChipsIn = chipsShown >= DEMO_WORDS.length;
  const showReview = phase === 'reviewing' || phase === 'cards';

  return (
    <Box ref={ref} sx={{
      position: 'relative', overflow: 'hidden',
      background: `linear-gradient(148deg, ${pink[50]} 0%, ${pink[100]} 30%, ${alpha(pink[50], 0.6)} 60%, ${pink[50]} 100%)`,
      py: { xs: 10, md: 10 },
      px: { xs: 2, sm: 4, md: 6, lg: 8 },
    }}>
      <Blob color={purple[300]} size={500} top="-100px" right="-80px" opacity={0.2} blur={90} />
      <Blob color={pink[300]} size={360} bottom="-60px" left="-70px" opacity={0.22} blur={80} pulse />
      <Blob color={sky[300]} size={260} top="40%" left="42%" opacity={0.14} blur={60} />
      <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: `radial-gradient(circle, ${alpha(pink[400], 0.08)} 1px, transparent 1px)`, backgroundSize: '48px 48px' }} />

      <Box sx={{ maxWidth: 1280, mx: 'auto', width: '100%', position: 'relative', zIndex: 1 }}>

        {/* ── Heading ── */}
        <Box sx={{ textAlign: 'center', mb: { xs: 6, md: 7 }, opacity: inView ? 1 : 0, transform: inView ? 'translateY(0)' : 'translateY(32px)', transition: 'opacity 0.8s ease, transform 0.8s ease' }}>
          <Typography sx={{ fontFamily: '"DM Serif Display", serif', fontSize: { xs: '2.2rem', sm: '3rem', md: '3.8rem' }, color: pink[700], mb: 1.5, lineHeight: 1.05 }}>
            Generate a full deck<br />in minutes
          </Typography>
          <Typography sx={{ fontSize: '1rem', color: alpha(pink[700], 0.62), maxWidth: 560, mx: 'auto', lineHeight: 1.7 }}>
            Type a few words or drop any PDF — Gemini AI generates readings, meanings,
            and bilingual example sentences for every card instantly.
          </Typography>
        </Box>

        {/* ── Step labels row ── */}
        <Box sx={{
          display: 'flex', flexDirection: { xs: 'column', lg: 'row' },
          gap: { xs: 2, lg: 4 }, mb: 1.5,
          opacity: inView ? 1 : 0, transform: inView ? 'translateY(0)' : 'translateY(28px)',
          transition: 'opacity 0.8s ease 0.15s, transform 0.8s ease 0.15s',
        }}>
          {[
            { n: 1, label: 'Generate cards', flex: '0 0 auto', width: { xs: '100%', lg: '46%' } },
            { n: 2, label: 'Review & edit', flex: 1, width: undefined },
          ].map(({ n, label, flex, width }) => (
            <Box key={n} sx={{ flex, width, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, ${pink[400]} 0%, ${purple[500]} 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 2px 8px ${alpha(pink[500], 0.38)}`,
              }}>
                <Typography sx={{ color: '#fff', fontSize: '0.65rem', fontWeight: 900, fontFamily: '"Nunito", sans-serif', lineHeight: 1 }}>{n}</Typography>
              </Box>
              <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: pink[600], fontFamily: '"Nunito", sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {label}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* ── ROW 1: Generate (left) + Review (right) ── */}
        <Box sx={{
          display: 'flex', flexDirection: { xs: 'column', lg: 'row' },
          gap: { xs: 3, lg: 4 }, alignItems: 'stretch', mb: { xs: 4, md: 5 },
          opacity: inView ? 1 : 0, transform: inView ? 'translateY(0)' : 'translateY(28px)',
          transition: 'opacity 0.8s ease 0.2s, transform 0.8s ease 0.2s',
        }}>

          {/* ── Left: Add Cards modal demo ── */}
          <Box sx={{ flex: '0 0 auto', width: { xs: '100%', lg: '46%' } }}>
            <Paper elevation={0} sx={{ borderRadius: '18px', overflow: 'hidden', height: '100%', boxShadow: `0 20px 64px ${alpha(pink[300], 0.2)}, 0 4px 16px ${alpha(purple[300], 0.1)}`, border: `1px solid ${alpha(pink[200], 0.7)}`, background: '#fff', display: 'flex', flexDirection: 'column' }}>
              {/* Chrome bar */}
              <Box sx={{ px: 2.5, py: 1.25, background: `linear-gradient(135deg, ${pink[500]} 0%, ${purple[600]} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography sx={{ fontFamily: '"Nunito", sans-serif', fontSize: '0.8rem', fontWeight: 800, color: '#fff' }}>✨ Add Cards</Typography>
                <Stack direction="row" spacing={0.75}>{[0,1,2].map(i => <Box key={i} sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: alpha('#fff', 0.35) }} />)}</Stack>
              </Box>

              <Box sx={{ p: { xs: 2, sm: 2.5 }, flex: 1, display: 'flex', flexDirection: 'column' }}>

                {/* View mode toggle row */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: 'text.secondary', fontFamily: '"Nunito", sans-serif', flexShrink: 0 }}>
                    Main display mode:
                  </Typography>
                  <Box sx={{ display: 'flex', ml: 'auto' }}>
                    {[['ひ Hiragana', false], ['漢 Kanji', false]].map(([lbl]) => (
                      <Box key={String(lbl)} sx={{ px: 1.5, py: 0.4, fontSize: '0.72rem', fontWeight: 700, fontFamily: '"Nunito", sans-serif', border: '1px solid rgba(249,168,212,0.5)', color: '#BE185D', cursor: 'default', '&:first-of-type': { borderRadius: '4px 0 0 4px' }, '&:last-of-type': { borderRadius: '0 4px 4px 0' } }}>{lbl}</Box>
                    ))}
                  </Box>
                </Box>

                {/* Generate with AI container */}
                <Box sx={{ bgcolor: '#FFF8FC', border: '1.5px solid rgba(249,168,212,0.35)', borderRadius: '14px', p: 2, mb: 2, flex: wordsState === 'generating' ? 1 : 'none' }}>
                  <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#EC4899', fontFamily: '"Nunito", sans-serif', mb: 1.25 }}>
                    Generate with AI
                  </Typography>

                  {wordsState === 'generating' && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mx: -2, mb: -2 }}>
                      <Loading message="Generating cards…" />
                    </Box>
                  )}

                  {wordsState !== 'generating' && (
                    <>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, p: '8px 10px', mb: 1.25, border: `1.5px solid ${chipsShown > 0 ? alpha(pink[400], 0.55) : alpha(pink[300], 0.3)}`, borderRadius: '10px', minHeight: 52, bgcolor: '#fff', transition: 'border-color 0.3s ease' }}>
                        {DEMO_WORDS.slice(0, chipsShown).map((w) => (
                          <Chip key={w} label={w} size="small" sx={{ height: 22, fontSize: '0.78rem', fontFamily: '"Nunito", sans-serif', fontWeight: 700, bgcolor: alpha(pink[100], 0.6), color: pink[700], border: `1px solid ${alpha(pink[400], 0.4)}`, animation: 'chipPopIn 0.3s ease forwards' }} />
                        ))}
                        {!allChipsIn && (
                          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, minWidth: 60 }}>
                            {chipsShown === 0 && <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', opacity: 0.55, fontFamily: '"Nunito", sans-serif' }}>Type words in any language…</Typography>}
                            <Box component="span" sx={{ display: 'inline-block', width: '2px', height: '1em', bgcolor: purple[400], ml: '2px', animation: 'cursorBlink 0.75s steps(1) infinite' }} />
                          </Box>
                        )}
                      </Box>

                      <Button variant="contained" fullWidth
                        disabled={!allChipsIn || wordsState === 'done'}
                        startIcon={<AutoAwesomeIcon sx={{ fontSize: 14 }} />}
                        sx={{
                          borderRadius: '10px', py: '9px',
                          fontFamily: '"Nunito", sans-serif', fontWeight: 800, fontSize: '0.82rem', textTransform: 'none',
                          background: allChipsIn && wordsState !== 'done' ? 'linear-gradient(135deg, #F472B6 0%, #EC4899 50%, #A855F7 100%)' : undefined,
                          boxShadow: allChipsIn && wordsState !== 'done' ? `0 4px 14px ${alpha(pink[500], 0.35)}` : 'none',
                          '&.Mui-disabled': { background: alpha(purple[100], 0.8), color: alpha(purple[700], 0.4) },
                        }}
                      >
                        {wordsState === 'done' ? `✓ ${DEMO_WORDS.length} cards generated!` : 'Generate Cards'}
                      </Button>
                    </>
                  )}
                </Box>

                {wordsState !== 'generating' && (
                  <>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                      <Box sx={{ flexGrow: 1, height: '1px', bgcolor: 'rgba(249,168,212,0.3)' }} />
                      <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(194,112,154,0.6)', fontFamily: '"Nunito", sans-serif' }}>or</Typography>
                      <Box sx={{ flexGrow: 1, height: '1px', bgcolor: 'rgba(249,168,212,0.3)' }} />
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {[
                        { icon: '📚', title: 'Add Existing Cards', desc: 'Copy from your other decks' },
                        { icon: '📄', title: 'Import from PDF', desc: 'Extract vocabulary from a document' },
                      ].map(btn => (
                        <Box key={btn.title} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: '12px 14px', border: '1.5px solid rgba(249,168,212,0.35)', borderRadius: '12px', bgcolor: '#FFFFFF', cursor: 'default' }}>
                          <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: btn.title.includes('PDF') ? '#F3E8FF' : '#FCE7F3', border: `1px solid ${btn.title.includes('PDF') ? 'rgba(196,181,253,0.45)' : 'rgba(244,114,182,0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1rem' }}>
                            {btn.icon}
                          </Box>
                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Typography sx={{ fontSize: '0.8rem', fontWeight: 800, color: '#9D174D', fontFamily: '"Nunito", sans-serif', lineHeight: 1.2 }}>{btn.title}</Typography>
                            <Typography sx={{ fontSize: '0.68rem', color: '#C2709A', fontFamily: '"Nunito", sans-serif', fontWeight: 500, mt: 0.2 }}>{btn.desc}</Typography>
                          </Box>
                          <Typography sx={{ fontSize: '0.75rem', color: 'rgba(194,112,154,0.5)' }}>›</Typography>
                        </Box>
                      ))}
                    </Box>
                  </>
                )}
              </Box>
            </Paper>
          </Box>

          {/* ── Right: ReviewCardsDialog inline replica ── */}
          <Box sx={{ flex: 1 }}>
            <Paper elevation={0} sx={{ borderRadius: '20px', overflow: 'hidden', height: '100%', border: '1.5px solid rgba(249,168,212,0.4)', boxShadow: '0 20px 60px rgba(236,72,153,0.14), 0 4px 16px rgba(249,168,212,0.2)', background: '#FFFBFE', display: 'flex', flexDirection: 'column' }}>
              {/* Dialog header */}
              <Box sx={{ background: 'linear-gradient(135deg, #FFF0F8 0%, #F3E8FF 100%)', borderBottom: '1.5px solid rgba(249,168,212,0.25)', px: { xs: 2, sm: 3 }, pt: 2.5, pb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                  <Box>
                    <Typography sx={{ fontSize: '1.05rem', fontWeight: 900, color: '#9D174D', fontFamily: '"Nunito", sans-serif', lineHeight: 1.2, mb: 0.4 }}>📋 Review Cards</Typography>
                    <Typography sx={{ fontSize: '0.7rem', color: '#C2709A', fontFamily: '"Nunito", sans-serif', fontWeight: 600 }}>
                      {showReview ? `${DEMO_WORDS.length} cards generated — edit before adding` : 'Waiting for generation…'}
                    </Typography>
                  </Box>
                  <Box sx={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(190,24,93,0.3)', fontSize: '0.75rem', flexShrink: 0 }}>✕</Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'rgba(255,255,255,0.6)', border: '1px solid rgba(249,168,212,0.25)', borderRadius: '10px', px: 1.5, py: 0.75, gap: 1, flexWrap: 'wrap', opacity: showReview ? 1 : 0.4, transition: 'opacity 0.5s ease' }}>
                  <Typography sx={{ fontSize: '0.57rem', fontWeight: 700, color: '#C2709A', fontFamily: '"Nunito", sans-serif', whiteSpace: 'nowrap' }}>Set main view mode for all cards:</Typography>
                  <ToggleButtonGroup
                    value="hiragana"
                    exclusive
                    size="small"
                    sx={{
                      '& .MuiToggleButton-root': {
                        px: 0.9, py: 0.3, fontSize: '0.6rem', fontWeight: 800,
                        fontFamily: '"Nunito", sans-serif', lineHeight: 1, minWidth: 0,
                        border: '1px solid rgba(249,168,212,0.4)', color: '#C2709A',
                        '&.Mui-selected': { bgcolor: 'rgba(249,168,212,0.2)', color: '#BE185D', borderColor: 'rgba(236,72,153,0.5)' },
                        '&:hover': { bgcolor: 'rgba(249,168,212,0.06)' },
                      },
                    }}
                  >
                    <ToggleButton value="hiragana">ひ Hiragana</ToggleButton>
                    <ToggleButton value="kanji">漢 Kanji</ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              </Box>

              {/* Card rows */}
              <Box sx={{ px: { xs: 1.5, sm: 2 }, py: 1.5, display: 'flex', flexDirection: 'column', gap: 0.75, flex: 1 }}>
                {!showReview && [0,1,2,3,4].map(i => (
                  <Box key={i} sx={{ border: '1.5px solid rgba(249,168,212,0.15)', borderRadius: '14px', bgcolor: 'rgba(255,248,252,0.7)', display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 0.875 }}>
                    <Box sx={{ width: 36, height: 36, borderRadius: '7px', bgcolor: 'rgba(249,168,212,0.08)', flexShrink: 0 }} />
                    <Box sx={{ flexGrow: 1 }}>
                      <Box sx={{ height: 12, borderRadius: 1, bgcolor: 'rgba(249,168,212,0.12)', mb: 0.6, width: `${55 + i * 7}%` }} />
                      <Box sx={{ height: 9, borderRadius: 1, bgcolor: 'rgba(249,168,212,0.08)', width: `${40 + i * 4}%` }} />
                    </Box>
                  </Box>
                ))}

                {showReview && DEMO_REVIEW_CARDS.map((card, i) => (
                  <Box key={card.word} sx={{
                    border: '1.5px solid rgba(249,168,212,0.3)', borderRadius: '14px',
                    bgcolor: '#FFFBFE', overflow: 'hidden',
                    opacity: reviewFilled > i ? 1 : 0,
                    transform: reviewFilled > i ? 'translateX(0)' : 'translateX(-12px)',
                    transition: 'opacity 0.35s ease, transform 0.35s ease, box-shadow 0.15s ease',
                    '&:hover': { boxShadow: '0 2px 12px rgba(249,168,212,0.2)' },
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1, cursor: 'default', userSelect: 'none' }}>
                      <Box sx={{ width: 40, height: 40, borderRadius: '8px', flexShrink: 0, overflow: 'hidden', bgcolor: 'rgba(249,168,212,0.12)' }}>
                        {DEMO_IMAGE_CARDS[i]?.imageUrl ? (
                          <Box component="img" src={DEMO_IMAGE_CARDS[i].imageUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography sx={{ fontSize: '0.68rem', color: '#C2709A' }}>—</Typography>
                          </Box>
                        )}
                      </Box>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography noWrap sx={{ fontSize: '0.88rem', fontWeight: 800, color: '#9D174D', fontFamily: '"Nunito", sans-serif', lineHeight: 1.25 }}>{card.word}</Typography>
                        <Typography noWrap sx={{ fontSize: '0.68rem', color: '#C2709A', fontFamily: '"Nunito", sans-serif', fontWeight: 600, lineHeight: 1.2 }}>{card.reading} · {card.meaning}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, ml: -0.5, flexShrink: 0 }}>
                        <Box sx={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(248,113,113,0.4)' }}>
                          <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                        </Box>
                        <Box sx={{ color: '#C2709A', display: 'flex', alignItems: 'center' }}>
                          <ExpandMoreIcon sx={{ fontSize: 18 }} />
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>

              {/* Footer buttons */}
              <Box sx={{ px: { xs: 1.5, sm: 2.5 }, py: 1.75, borderTop: '1.5px solid rgba(249,168,212,0.2)', display: 'flex', gap: 1.5, justifyContent: 'flex-end', background: 'linear-gradient(0deg, #FFFBFE 0%, transparent 100%)', opacity: showReview ? 1 : 0.4, transition: 'opacity 0.5s ease' }}>
                <Box sx={{ px: 2, py: 0.7, borderRadius: '10px', border: '1px solid rgba(249,168,212,0.5)', color: '#BE185D', fontSize: '0.76rem', fontFamily: '"Nunito", sans-serif', fontWeight: 700 }}>Cancel</Box>
                <Box sx={{ px: 2.25, py: 0.7, borderRadius: '10px', background: showReview ? 'linear-gradient(135deg, #F472B6 0%, #EC4899 50%, #A855F7 100%)' : alpha(purple[100], 0.8), color: showReview ? '#fff' : alpha(purple[700], 0.4), fontSize: '0.76rem', fontFamily: '"Nunito", sans-serif', fontWeight: 800, boxShadow: showReview ? '0 4px 14px rgba(236,72,153,0.35)' : 'none', transition: 'all 0.5s ease' }}>
                  ✓ Add {DEMO_WORDS.length} Cards to Deck
                </Box>
              </Box>
            </Paper>
          </Box>
        </Box>

        {/* ── ROW 2: ImageCard grid ── */}
        <Box sx={{
          opacity: phase === 'cards' ? 1 : 0,
          transform: phase === 'cards' ? 'translateY(0)' : 'translateY(28px)',
          transition: 'opacity 0.7s ease, transform 0.7s ease',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <Box sx={{ flex: 1, height: 1, bgcolor: alpha(pink[300], 0.3) }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, ${pink[400]} 0%, ${purple[500]} 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 2px 8px ${alpha(pink[500], 0.38)}`,
              }}>
                <Typography sx={{ color: '#fff', fontSize: '0.65rem', fontWeight: 900, fontFamily: '"Nunito", sans-serif', lineHeight: 1 }}>3</Typography>
              </Box>
              <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, color: pink[500], fontFamily: '"Nunito", sans-serif', letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                Study your deck
              </Typography>
            </Box>
            <Box sx={{ flex: 1, height: 1, bgcolor: alpha(pink[300], 0.3) }} />
          </Box>

          <Box sx={{
            display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'stretch',
            justifyContent: 'center',
          }}>
            <ThemeProvider theme={sakuraTheme}>
              {DEMO_IMAGE_CARDS.map((card, i) => (
                <Box key={card.id} sx={{
                  width: 240,
                  '& > div': { height: '100%' },
                  '& > div > div': { height: '100%' },
                  opacity: cardsVisible > i ? 1 : 0,
                  transform: cardsVisible > i ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.94)',
                  transition: 'opacity 0.45s ease, transform 0.45s cubic-bezier(0.34,1.56,0.64,1)',
                }}>
                  <ImageCard card={card} onDelete={() => {}} />
                </Box>
              ))}
            </ThemeProvider>
          </Box>
        </Box>

      </Box>
    </Box>
  );
}

// ─── Section 4: How it works (Yuki — ice blue) ───────────────────────────────

const STEPS = [
  { n: 1, emoji: '✍️', title: 'Create a deck',      desc: 'Give your deck a name and description. Organise by topic, JLPT level, or whatever works for you.' },
  { n: 2, emoji: '🤖', title: 'Add cards with AI',  desc: 'Type a word or upload a PDF. Gemini AI fills readings, meanings, and example sentences instantly.' },
  { n: 3, emoji: '🎮', title: 'Study & practise',   desc: 'Flip through cards or challenge yourself with Match, Fill, or Recall modes. Earn XP every session.' },
  { n: 4, emoji: '📈', title: 'Track your growth',  desc: 'Watch your streak grow, unlock achievements, and see your accuracy improve over time.' },
];

export function HowItWorksSection() {
  const { ref, inView } = useInView(0.1);

  return (
    <Box ref={ref} sx={{
      minHeight: '100vh',
      position: 'relative', overflow: 'hidden',
      background: `linear-gradient(148deg, ${sky[50]} 0%, ${sky[100]} 35%, ${alpha(sky[100], 0.5)} 65%, ${sky[50]} 100%)`,
      display: 'flex', alignItems: 'center',
      py: { xs: 10, md: 8 },
      px: { xs: 2, sm: 4, md: 6, lg: 8 },
    }}>
      <Blob color={sky[300]} size={520} top="-120px" right="-90px" opacity={0.28} blur={90} pulse />
      <Blob color={purple[300]} size={360} bottom="-30px" left="-70px" opacity={0.2} blur={80} />
      <Blob color={sky[200]} size={280} top="45%" left="45%" opacity={0.25} blur={60} />

      {/* Subtle grid */}
      <Box sx={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `linear-gradient(${alpha(sky[300], 0.15)} 1px, transparent 1px), linear-gradient(90deg, ${alpha(sky[300], 0.15)} 1px, transparent 1px)`,
        backgroundSize: '64px 64px',
      }} />

      <Box sx={{
        maxWidth: 1220, mx: 'auto', width: '100%', position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: { xs: 'column', lg: 'row' },
        gap: { xs: 8, lg: 14 }, alignItems: 'center',
      }}>
        {/* Left: heading + stats */}
        <Box sx={{
          flex: '0 0 auto', maxWidth: { lg: 360 },
          opacity: inView ? 1 : 0,
          transform: inView ? 'translateX(0)' : 'translateX(-40px)',
          transition: 'opacity 0.8s ease, transform 0.8s ease',
        }}>
          <Typography sx={{
            fontFamily: '"DM Serif Display", serif',
            fontSize: { xs: '2.4rem', sm: '3rem', lg: '3.6rem' },
            color: sky[700], lineHeight: 1.05, mb: 2,
          }}>
            Up and running<br />in minutes
          </Typography>
          <Typography sx={{ fontSize: '1rem', color: alpha(sky[700], 0.62), lineHeight: 1.8, mb: 4 }}>
            No complicated setup. Create an account, make a deck, and start studying.
            Progress is saved automatically.
          </Typography>
          <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
            {[['3', 'practice modes'], ['5', 'JLPT levels'], ['∞', 'vocab words']].map(([n, label]) => (
              <Box key={label}>
                <Typography sx={{ fontFamily: '"DM Serif Display", serif', fontSize: '2.6rem', color: sky[600], lineHeight: 1 }}>{n}</Typography>
                <Typography sx={{ fontSize: '0.72rem', color: alpha(sky[700], 0.52), letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</Typography>
              </Box>
            ))}
          </Stack>
        </Box>

        {/* Right: step list */}
        <Box sx={{ flex: 1 }}>
          {STEPS.map((s, i) => (
            <Box key={s.n} sx={{
              display: 'flex', gap: 3,
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateX(0)' : 'translateX(40px)',
              transition: `opacity 0.65s ease ${0.15 * i}s, transform 0.65s ease ${0.15 * i}s`,
            }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <Box sx={{
                  width: 54, height: 54, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${sky[400]} 0%, ${sky[600]} 100%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 6px 24px ${alpha(sky[500], 0.42)}`,
                  flexShrink: 0,
                }}>
                  <Typography sx={{ fontFamily: '"DM Serif Display", serif', fontSize: '1.4rem', color: '#fff', lineHeight: 1 }}>
                    {s.n}
                  </Typography>
                </Box>
                {i < STEPS.length - 1 && (
                  <Box sx={{
                    width: 2, flex: 1, minHeight: 40, mt: 0.5,
                    background: `linear-gradient(180deg, ${sky[400]}, ${alpha(sky[300], 0.25)})`,
                    borderRadius: 2,
                  }} />
                )}
              </Box>
              <Box sx={{ pb: i < STEPS.length - 1 ? 5 : 0, pt: 0.5 }}>
                <Typography sx={{ fontFamily: '"DM Serif Display", serif', fontSize: '1.25rem', color: sky[700], mb: 0.75 }}>
                  {s.emoji} {s.title}
                </Typography>
                <Typography sx={{ fontSize: '0.9rem', color: alpha(sky[700], 0.62), lineHeight: 1.75 }}>
                  {s.desc}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

// ─── Section 5: Practice modes + Embed demo (Sakura light) ───────────────────

const MODES = [
  {
    emoji: '🔗', title: 'Match',
    desc: 'Race the clock matching Japanese words to their meanings. Great for rapid-fire vocabulary drilling.',
    color: emerald[500], bg: alpha(emerald[100], 0.55), border: alpha(emerald[300], 0.55),
  },
  {
    emoji: '✏️', title: 'Fill in the blank',
    desc: 'Read a sentence and type the missing word. Builds reading comprehension alongside vocabulary.',
    color: purple[600], bg: alpha(purple[100], 0.6), border: alpha(purple[300], 0.55),
  },
  {
    emoji: '🧠', title: 'Recall',
    desc: 'See the meaning, type the Japanese. The hardest mode — and the best for long-term retention.',
    color: pink[600], bg: alpha(pink[100], 0.6), border: alpha(pink[300], 0.55),
  },
];

export function PracticeSection() {
  const { ref, inView } = useInView(0.1);

  return (
    <Box ref={ref} sx={{
      minHeight: '100vh',
      position: 'relative', overflow: 'hidden',
      background: `linear-gradient(148deg, ${pink[50]} 0%, ${alpha(pink[100], 0.6)} 35%, ${alpha(purple[50], 0.75)} 70%, ${pink[50]} 100%)`,
      display: 'flex', alignItems: 'center',
      py: { xs: 10, md: 8 },
      px: { xs: 2, sm: 4, md: 6, lg: 8 },
    }}>
      <Blob color={pink[300]} size={440} top="-60px" left="-60px" opacity={0.28} blur={80} />
      <Blob color={purple[300]} size={380} bottom="-60px" right="-60px" opacity={0.22} blur={75} />

      <Box sx={{ maxWidth: 1220, mx: 'auto', width: '100%', position: 'relative', zIndex: 1 }}>
        {/* Practice modes header */}
        <Box sx={{
          textAlign: 'center', mb: { xs: 5, md: 7 },
          opacity: inView ? 1 : 0, transform: inView ? 'translateY(0)' : 'translateY(32px)',
          transition: 'opacity 0.8s ease, transform 0.8s ease',
        }}>
          <Typography sx={{
            fontFamily: '"DM Serif Display", serif',
            fontSize: { xs: '2.2rem', sm: '2.8rem', md: '3.4rem' },
            color: pink[700], mb: 1.5, lineHeight: 1.05,
          }}>
            Three ways to practise
          </Typography>
          <Typography sx={{ fontSize: '1rem', color: alpha(pink[700], 0.6), maxWidth: 480, mx: 'auto', lineHeight: 1.7 }}>
            Switch between modes to keep sessions fresh and challenging.
            Each one earns XP toward your next level.
          </Typography>
        </Box>

        {/* Mode cards */}
        <Box sx={{
          display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          gap: 2.5, mb: { xs: 9, md: 11 },
        }}>
          {MODES.map((m, i) => (
            <Paper key={m.title} elevation={0}
              sx={{
                p: 3.5, borderRadius: 5,
                background: m.bg, border: `1.5px solid ${m.border}`,
                display: 'flex', flexDirection: 'column', gap: 2,
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(32px)',
                transition: `opacity 0.65s ease ${0.12 * i}s, transform 0.65s ease ${0.12 * i}s`,
                '&:hover': {
                  transform: 'translateY(-6px) !important',
                  boxShadow: `0 14px 44px ${alpha(m.color, 0.22)}`,
                  transition: 'all 0.25s ease !important',
                },
              }}
            >
              <Typography sx={{ fontSize: '2.6rem', lineHeight: 1 }}>{m.emoji}</Typography>
              <Typography sx={{ fontFamily: '"DM Serif Display", serif', fontSize: '1.3rem', color: m.color }}>
                {m.title}
              </Typography>
              <Typography sx={{ fontSize: '0.87rem', color: 'text.secondary', lineHeight: 1.72 }}>
                {m.desc}
              </Typography>
            </Paper>
          ))}
        </Box>

        {/* Embed demo */}
        <Box sx={{
          display: 'flex', flexDirection: { xs: 'column', md: 'row' },
          gap: { xs: 6, md: 10 }, alignItems: 'center',
          borderTop: `1.5px solid ${alpha(pink[300], 0.32)}`,
          pt: { xs: 7, md: 9 },
        }}>
          {/* Browser mockup with EmbedFlashcard */}
          <Box sx={{
            flex: '0 0 auto', width: { xs: '100%', sm: 360 },
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateX(0)' : 'translateX(-36px)',
            transition: 'opacity 0.75s ease 0.3s, transform 0.75s ease 0.3s',
          }}>
            <Paper elevation={0} sx={{
              borderRadius: 4, overflow: 'hidden',
              boxShadow: `0 20px 64px ${alpha(pink[400], 0.22)}, 0 4px 16px ${alpha(pink[500], 0.12)}`,
              border: `1px solid ${alpha(pink[200], 0.5)}`,
            }}>
              {/* Browser chrome */}
              <Box sx={{
                bgcolor: macChrome.bar, px: 2, py: 1.25,
                display: 'flex', alignItems: 'center', gap: 1,
                borderBottom: `1px solid ${macChrome.border}`,
              }}>
                {[macChrome.red, macChrome.yellow, macChrome.green].map(c => (
                  <Box key={c} sx={{ width: 11, height: 11, borderRadius: '50%', bgcolor: c, flexShrink: 0 }} />
                ))}
                <Box sx={{
                  flex: 1, ml: 1.5, bgcolor: macChrome.addressBg, borderRadius: 2,
                  px: 1.5, py: 0.5, border: `1px solid ${macChrome.addressBorder}`,
                  display: 'flex', alignItems: 'center',
                }}>
                  <Typography sx={{ fontSize: '0.62rem', color: macChrome.text, letterSpacing: '0.02em', fontFamily: '"DM Mono", monospace' }}>
                    kannanao.vercel.app/embed/demo-yume
                  </Typography>
                </Box>
              </Box>
              {/* Embedded card */}
              <Box sx={{ p: 2, bgcolor: alpha(purple[50], 0.6) }}>
                <ThemeProvider theme={murasakiTheme}>
                  <EmbedFlashcard card={YUME_CARD} height={268} />
                </ThemeProvider>
              </Box>
              <Box sx={{ px: 2, py: 1.25, bgcolor: macChrome.footerBg, borderTop: `1px solid ${macChrome.footerBorder}` }}>
                <Typography sx={{ fontSize: '0.62rem', color: macChrome.text, textAlign: 'center', fontFamily: '"DM Mono", monospace' }}>
                  Powered by 🌸 Kannanao
                </Typography>
              </Box>
            </Paper>
          </Box>

          {/* Copy */}
          <Box sx={{
            flex: 1,
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateX(0)' : 'translateX(36px)',
            transition: 'opacity 0.75s ease 0.42s, transform 0.75s ease 0.42s',
          }}>
            <Typography sx={{
              fontFamily: '"DM Serif Display", serif',
              fontSize: { xs: '2rem', sm: '2.6rem', md: '3rem' },
              color: pink[700], mb: 1.5, lineHeight: 1.08,
            }}>
              Share & embed<br />your decks
            </Typography>
            <Typography sx={{ fontSize: '0.97rem', color: alpha(pink[700], 0.62), lineHeight: 1.8, mb: 3.5 }}>
              Share any deck with a single link — friends and classmates can study
              instantly with no account required. Or embed an interactive flashcard
              widget directly on your blog, Notion page, or website.
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {['🔗 One-click sharing', '🌐 Embeddable widget', '👥 Study together', '🔒 No account needed'].map(tag => (
                <Chip key={tag} label={tag} size="small" sx={{
                  bgcolor: alpha(pink[50], 0.95), color: pink[700], fontSize: '0.72rem',
                  border: `1px solid ${alpha(pink[300], 0.55)}`, borderRadius: 4,
                }} />
              ))}
            </Stack>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ─── Section 6: CTA / Waitlist (Murasaki dark) ───────────────────────────────

export function CtaSection() {
  const router = useRouter();
  const { session } = useAuth();
  const { ref, inView } = useInView(0.08);

  return (
    <Box id="waitlist" ref={ref} sx={{
      minHeight: '100vh',
      position: 'relative', overflow: 'hidden',
      background: `linear-gradient(160deg, ${darkPurple.base} 0%, ${darkPurple.mid} 40%, ${darkPurple.midAlt} 75%, ${darkPurple.deepest} 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      py: { xs: 10, md: 8 },
      px: { xs: 2, sm: 4, md: 6 },
    }}>
      <Blob color={pink[500]} size={560} top="-120px" right="-90px" opacity={0.18} blur={110} pulse />
      <Blob color={purple[600]} size={440} bottom="-90px" left="-70px" opacity={0.16} blur={100} />
      <Blob color={sky[500]} size={280} top="52%" left="32%" opacity={0.09} blur={80} />

      {/* Star field */}
      <Box sx={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `radial-gradient(circle, ${alpha('#fff', 0.045)} 1px, transparent 1px)`,
        backgroundSize: '38px 38px',
      }} />

      <Box sx={{
        position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 700, width: '100%',
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(40px)',
        transition: 'opacity 0.9s ease, transform 0.9s ease',
      }}>
        <Typography sx={{
          fontFamily: '"Noto Serif JP", serif',
          fontSize: { xs: '5rem', sm: '7rem', md: '9rem' },
          color: alpha('#fff', 0.05), lineHeight: 1,
          mb: 1.5, userSelect: 'none',
        }}>
          頑張ろう
        </Typography>

        <Chip
          icon={<AutoAwesomeIcon sx={{ fontSize: '0.85rem !important', color: `${purple[300]} !important` }} />}
          label="Closed beta — spots opening soon"
          size="small"
          sx={{
            mb: 3, bgcolor: alpha(purple[400], 0.18), color: purple[200],
            fontWeight: 700, fontSize: '0.72rem',
            border: `1px solid ${alpha(purple[400], 0.38)}`, borderRadius: 6,
          }}
        />

        <Typography sx={{
          fontFamily: '"DM Serif Display", serif',
          fontSize: { xs: '2.6rem', sm: '3.4rem', md: '4.2rem' },
          color: 'white', lineHeight: 1.02, mb: 2.5,
        }}>
          Ready to level up your<br />Japanese skills?
        </Typography>

        <Typography sx={{
          fontSize: '1rem', color: alpha('#fff', 0.52),
          mb: 5, maxWidth: 520, mx: 'auto', lineHeight: 1.8,
        }}>
          Kannanao is currently in closed beta. Drop your email and we&apos;ll
          notify you the moment new spots open up.
        </Typography>

        {session ? (
          <Button variant="contained" size="large" onClick={() => router.push('/')}
            sx={{
              fontFamily: '"DM Serif Display", serif', fontSize: '1.1rem',
              textTransform: 'none', borderRadius: 8, px: 5, py: 1.6,
              background: `linear-gradient(135deg, ${pink[400]} 0%, ${pink[600]} 100%)`,
              boxShadow: `0 10px 36px ${alpha(pink[500], 0.48)}`,
              '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 16px 48px ${alpha(pink[500], 0.58)}` },
            }}>
            Go to dashboard 🌸
          </Button>
        ) : (
          <WaitlistForm dark />
        )}

        {/* Footer */}
        <Box sx={{
          mt: 8, pt: 3,
          borderTop: `1px solid ${alpha('#fff', 0.1)}`,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          width: '100%',
        }}>
          <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
            <Typography sx={{ fontFamily: '"DM Serif Display", serif', fontSize: '0.9rem', color: alpha('#fff', 0.35) }}>
              🌸 Kannanao
            </Typography>
            <Typography sx={{ fontSize: '0.68rem', color: alpha('#fff', 0.2), letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              AI-powered Japanese flashcard studio
            </Typography>
          </Box>
          <Typography sx={{ fontFamily: '"DM Serif Display", serif', fontSize: '0.75rem', color: alpha('#fff', 0.25) }}>
            Made with 💕 by{' '}
            <Link
              href="https://www.variationsonastring.com"
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
              sx={{
                fontFamily: '"DM Serif Display", serif',
                fontSize: '0.75rem',
                color: alpha('#fff', 0.4),
                fontStyle: 'italic',
                '&:hover': { color: alpha('#fff', 0.65) },
              }}
            >
              Variations on a String
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

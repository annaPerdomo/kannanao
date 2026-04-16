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
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { Flashcard } from '@/components/Flashcard';
import { EmbedFlashcard } from '@/components/EmbedFlashcard';
import type { Flashcard as FlashcardType } from '@/types/flashcard';
import { createAppTheme } from '@/theme';
import WaitlistForm from '@/components/WaitlistForm';
import { useAuth } from '@/contexts/AuthContext';

// ─── Theme instances ──────────────────────────────────────────────────────────

const sakuraTheme = createAppTheme('sakura');
const murasakiTheme = createAppTheme('murasaki');

// ─── Color constants (mirrors src/theme/index.ts) ─────────────────────────────

const P = { 50:'#FFF5FB',100:'#FDE8F3',200:'#FBCFE8',300:'#F9A8D4',400:'#F472B6',500:'#EC4899',600:'#DB2777',700:'#BE185D' };
const V = { 50:'#F5F3FF',100:'#EDE9FE',200:'#DDD6FE',300:'#C4B5FD',400:'#A78BFA',500:'#8B5CF6',600:'#7C3AED',700:'#6D28D9' };
const S = { 50:'#F0F9FF',100:'#E0F2FE',200:'#BAE6FD',300:'#7DD3FC',400:'#38BDF8',500:'#0EA5E9',600:'#0284C7',700:'#0369A1' };

// ─── Demo flashcard data ──────────────────────────────────────────────────────

const SAKURA_CARD: FlashcardType = {
  id: 'demo-sakura',
  word: '桜',
  reading: 'さくら',
  meaning: 'cherry blossom',
  image_query: 'cherry blossom japan',
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

// ─── useInView hook ───────────────────────────────────────────────────────────

function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ─── Floating sakura petals ───────────────────────────────────────────────────

function SakuraPetals({ count = 14 }: { count?: number }) {
  const petals = Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${(i * 7.3 + 3) % 100}%`,
    delay: `${(i * 0.65) % 9}s`,
    duration: `${9 + (i % 5) * 1.6}s`,
    size: `${0.85 + (i % 3) * 0.4}rem`,
    opacity: 0.45 + (i % 3) * 0.15,
  }));

  return (
    <Box sx={{
      position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0,
      '@keyframes petalFall': {
        '0%': { transform: 'translateY(-60px) rotate(0deg) translateX(0px)', opacity: 0 },
        '8%': { opacity: 1 },
        '90%': { opacity: 0.55 },
        '100%': { transform: 'translateY(108vh) rotate(840deg) translateX(70px)', opacity: 0 },
      },
    }}>
      {petals.map(p => (
        <Box key={p.id} component="span" sx={{
          position: 'absolute', left: p.left, top: '-60px',
          fontSize: p.size, opacity: p.opacity,
          animation: `petalFall ${p.duration} linear ${p.delay} infinite`,
          filter: 'blur(0.2px)',
        }}>🌸</Box>
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

function HeroSection({ session }: { session: unknown }) {
  const router = useRouter();
  const { ref, inView } = useInView(0.05);

  return (
    <Box ref={ref} sx={{
      minHeight: '100vh',
      position: 'relative', overflow: 'hidden',
      background: `linear-gradient(148deg, ${P[50]} 0%, ${P[100]} 30%, #FEF2FC 60%, ${P[50]} 100%)`,
      display: 'flex', alignItems: 'center',
      pt: { xs: 12, md: 6 }, pb: { xs: 8, md: 6 },
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
      <SakuraPetals count={16} />
      <Blob color={P[300]} size={560} top="-120px" right="-100px" opacity={0.22} blur={90} pulse />
      <Blob color={V[300]} size={380} bottom="-40px" left="-70px" opacity={0.18} blur={80} />
      <Blob color={P[200]} size={260} top="35%" right="18%" opacity={0.28} blur={55} />

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
            icon={<AutoAwesomeIcon sx={{ fontSize: '0.85rem !important', color: '#B45309 !important' }} />}
            label="✨ Closed beta — join the waitlist"
            size="small"
            sx={{
              mb: 3, bgcolor: 'rgba(251,191,36,0.12)', color: '#B45309',
              fontWeight: 700, fontSize: '0.72rem',
              border: '1px solid rgba(251,191,36,0.35)', borderRadius: 6,
            }}
          />

          <Typography component="h1" sx={{
            fontFamily: '"DM Serif Display", serif',
            fontSize: { xs: '3.4rem', sm: '4.2rem', lg: '5.2rem' },
            lineHeight: 0.98, mb: 2.5,
            background: `linear-gradient(135deg, ${P[600]} 0%, ${V[500]} 50%, ${S[500]} 100%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            Learn Japanese,<br />one card<br />at a time.
          </Typography>

          <Typography sx={{
            fontSize: { xs: '1rem', sm: '1.15rem' },
            color: alpha(P[700], 0.72), lineHeight: 1.8,
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
                  background: `linear-gradient(135deg, ${P[400]} 0%, ${P[600]} 100%)`,
                  boxShadow: `0 8px 28px ${alpha(P[500], 0.42)}`,
                  '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 14px 40px ${alpha(P[500], 0.52)}` },
                }}>
                Go to dashboard 🌸
              </Button>
            ) : (
              <>
                <Button variant="contained" size="large"
                  onClick={() => document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })}
                  sx={{ fontFamily: '"DM Serif Display", serif', fontSize: '1.05rem', textTransform: 'none', borderRadius: 8, px: 4, py: 1.5,
                    background: `linear-gradient(135deg, ${P[400]} 0%, ${P[600]} 100%)`,
                    boxShadow: `0 8px 28px ${alpha(P[500], 0.42)}`,
                    '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 14px 40px ${alpha(P[500], 0.52)}` },
                  }}>
                  Join the waitlist 🌸
                </Button>
                <Button variant="outlined" size="large" onClick={() => router.push('/login')}
                  sx={{ fontFamily: '"DM Serif Display", serif', fontSize: '1.05rem', textTransform: 'none', borderRadius: 8, px: 3.5, py: 1.5,
                    borderColor: alpha(P[400], 0.6), color: P[700],
                    '&:hover': { borderColor: P[500], bgcolor: alpha(P[100], 0.6) },
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
                bgcolor: alpha(P[50], 0.95), color: P[700], fontSize: '0.72rem',
                border: `1px solid ${alpha(P[300], 0.55)}`, borderRadius: 4,
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
          {/* Glow layer behind card */}
          <Box sx={{
            position: 'absolute', inset: '8% 4%', borderRadius: 8,
            background: `radial-gradient(ellipse at center, ${alpha(P[400], 0.38)} 0%, transparent 70%)`,
            filter: 'blur(36px)', pointerEvents: 'none',
          }} />
          <Box sx={{ animation: 'floatCard 7s ease-in-out infinite', position: 'relative' }}>
            <ThemeProvider theme={sakuraTheme}>
              <Flashcard card={SAKURA_CARD} height={450} />
            </ThemeProvider>
          </Box>
          <Typography sx={{
            textAlign: 'center', mt: 2,
            fontSize: '0.72rem', color: alpha(P[600], 0.55), letterSpacing: '0.12em', textTransform: 'uppercase',
          }}>
            ✦ click the card to flip it ✦
          </Typography>
        </Box>
      </Box>

      {/* Scroll indicator */}
      <Box sx={{
        position: 'absolute', bottom: 28, left: '50%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75,
        animation: 'scrollBounce 2.2s ease-in-out infinite',
        opacity: 0.5, pointerEvents: 'none',
      }}>
        <Typography sx={{ fontSize: '0.6rem', letterSpacing: '0.22em', color: P[600], textTransform: 'uppercase' }}>scroll</Typography>
        <Box sx={{ width: 1.5, height: 36, background: `linear-gradient(180deg, ${P[500]}, transparent)`, borderRadius: 2 }} />
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

function FeaturesSection() {
  const { ref, inView } = useInView(0.08);

  return (
    <Box ref={ref} sx={{
      minHeight: '100vh',
      position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(160deg, #1A0A3C 0%, #2E1065 40%, #1e0a4a 75%, #0f0624 100%)',
      display: 'flex', alignItems: 'center',
      py: { xs: 10, md: 8 },
      px: { xs: 2, sm: 4, md: 6, lg: 8 },
    }}>
      <Blob color={V[600]} size={640} top="-160px" left="-120px" opacity={0.18} blur={110} pulse />
      <Blob color={P[500]} size={420} bottom="-80px" right="-80px" opacity={0.14} blur={90} />
      <Blob color={S[500]} size={300} top="45%" left="55%" opacity={0.09} blur={80} />

      {/* Star-field dots */}
      <Box sx={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)',
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
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.09)',
                backdropFilter: 'blur(14px)',
                display: 'flex', flexDirection: 'column', gap: 1.5,
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(32px)',
                transition: `opacity 0.65s ease ${0.06 * i}s, transform 0.65s ease ${0.06 * i}s`,
                '&:hover': {
                  background: 'rgba(255,255,255,0.09)',
                  border: `1px solid ${alpha(V[400], 0.45)}`,
                  boxShadow: `0 8px 36px ${alpha(V[600], 0.3)}`,
                  transform: 'translateY(-5px) !important',
                  transition: 'all 0.25s ease !important',
                },
              }}
            >
              <Typography sx={{ fontSize: '2rem', lineHeight: 1 }}>{f.emoji}</Typography>
              <Typography sx={{ fontFamily: '"DM Serif Display", serif', fontSize: '1.02rem', color: alpha(V[200], 0.95), lineHeight: 1.2 }}>
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

// ─── Section 3: How it works (Yuki — ice blue) ───────────────────────────────

const STEPS = [
  { n: 1, emoji: '✍️', title: 'Create a deck',      desc: 'Give your deck a name and description. Organise by topic, JLPT level, or whatever works for you.' },
  { n: 2, emoji: '🤖', title: 'Add cards with AI',  desc: 'Type a word or upload a PDF. Gemini AI fills readings, meanings, and example sentences instantly.' },
  { n: 3, emoji: '🎮', title: 'Study & practise',   desc: 'Flip through cards or challenge yourself with Match, Fill, or Recall modes. Earn XP every session.' },
  { n: 4, emoji: '📈', title: 'Track your growth',  desc: 'Watch your streak grow, unlock achievements, and see your accuracy improve over time.' },
];

function HowItWorksSection() {
  const { ref, inView } = useInView(0.1);

  return (
    <Box ref={ref} sx={{
      minHeight: '100vh',
      position: 'relative', overflow: 'hidden',
      background: `linear-gradient(148deg, ${S[50]} 0%, ${S[100]} 35%, #E8F4FE 65%, ${S[50]} 100%)`,
      display: 'flex', alignItems: 'center',
      py: { xs: 10, md: 8 },
      px: { xs: 2, sm: 4, md: 6, lg: 8 },
    }}>
      <Blob color={S[300]} size={520} top="-120px" right="-90px" opacity={0.28} blur={90} pulse />
      <Blob color={V[300]} size={360} bottom="-30px" left="-70px" opacity={0.2} blur={80} />
      <Blob color={S[200]} size={280} top="45%" left="45%" opacity={0.25} blur={60} />

      {/* Subtle grid */}
      <Box sx={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `linear-gradient(${alpha(S[300], 0.15)} 1px, transparent 1px), linear-gradient(90deg, ${alpha(S[300], 0.15)} 1px, transparent 1px)`,
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
            color: S[700], lineHeight: 1.05, mb: 2,
          }}>
            Up and running<br />in minutes
          </Typography>
          <Typography sx={{ fontSize: '1rem', color: alpha(S[700], 0.62), lineHeight: 1.8, mb: 4 }}>
            No complicated setup. Create an account, make a deck, and start studying.
            Progress is saved automatically.
          </Typography>
          <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
            {[['3', 'practice modes'], ['5', 'JLPT levels'], ['∞', 'vocab words']].map(([n, label]) => (
              <Box key={label}>
                <Typography sx={{ fontFamily: '"DM Serif Display", serif', fontSize: '2.6rem', color: S[600], lineHeight: 1 }}>{n}</Typography>
                <Typography sx={{ fontSize: '0.72rem', color: alpha(S[700], 0.52), letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</Typography>
              </Box>
            ))}
          </Stack>
        </Box>

        {/* Right: step list */}
        <Box sx={{ flex: 1 }}>
          {STEPS.map((s, i) => (
            <Box key={s.n} sx={{
              display: 'flex', gap: 3,
              mb: i < STEPS.length - 1 ? 0 : 0,
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateX(0)' : 'translateX(40px)',
              transition: `opacity 0.65s ease ${0.15 * i}s, transform 0.65s ease ${0.15 * i}s`,
            }}>
              {/* Circle + connecting line */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <Box sx={{
                  width: 54, height: 54, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${S[400]} 0%, ${S[600]} 100%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 6px 24px ${alpha(S[500], 0.42)}`,
                  flexShrink: 0,
                }}>
                  <Typography sx={{ fontFamily: '"DM Serif Display", serif', fontSize: '1.4rem', color: '#fff', lineHeight: 1 }}>
                    {s.n}
                  </Typography>
                </Box>
                {i < STEPS.length - 1 && (
                  <Box sx={{
                    width: 2, flex: 1, minHeight: 40, mt: 0.5,
                    background: `linear-gradient(180deg, ${S[400]}, ${alpha(S[300], 0.25)})`,
                    borderRadius: 2,
                  }} />
                )}
              </Box>
              <Box sx={{ pb: i < STEPS.length - 1 ? 5 : 0, pt: 0.5 }}>
                <Typography sx={{ fontFamily: '"DM Serif Display", serif', fontSize: '1.25rem', color: S[700], mb: 0.75 }}>
                  {s.emoji} {s.title}
                </Typography>
                <Typography sx={{ fontSize: '0.9rem', color: alpha(S[700], 0.62), lineHeight: 1.75 }}>
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

// ─── Section 4: Practice modes + Embed demo (Sakura light) ───────────────────

const MODES = [
  {
    emoji: '🔗', title: 'Match',
    desc: 'Race the clock matching Japanese words to their meanings. Great for rapid-fire vocabulary drilling.',
    color: '#10B981', bg: 'rgba(209,250,229,0.55)', border: 'rgba(110,231,183,0.55)',
  },
  {
    emoji: '✏️', title: 'Fill in the blank',
    desc: 'Read a sentence and type the missing word. Builds reading comprehension alongside vocabulary.',
    color: V[600], bg: alpha(V[100], 0.6), border: alpha(V[300], 0.55),
  },
  {
    emoji: '🧠', title: 'Recall',
    desc: 'See the meaning, type the Japanese. The hardest mode — and the best for long-term retention.',
    color: P[600], bg: alpha(P[100], 0.6), border: alpha(P[300], 0.55),
  },
];

function PracticeSection() {
  const { ref, inView } = useInView(0.1);

  return (
    <Box ref={ref} sx={{
      minHeight: '100vh',
      position: 'relative', overflow: 'hidden',
      background: `linear-gradient(148deg, ${P[50]} 0%, #FEF0FB 35%, ${alpha(V[50], 0.75)} 70%, ${P[50]} 100%)`,
      display: 'flex', alignItems: 'center',
      py: { xs: 10, md: 8 },
      px: { xs: 2, sm: 4, md: 6, lg: 8 },
    }}>
      <Blob color={P[300]} size={440} top="-60px" left="-60px" opacity={0.28} blur={80} />
      <Blob color={V[300]} size={380} bottom="-60px" right="-60px" opacity={0.22} blur={75} />

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
            color: P[700], mb: 1.5, lineHeight: 1.05,
          }}>
            Three ways to practise
          </Typography>
          <Typography sx={{ fontSize: '1rem', color: alpha(P[700], 0.6), maxWidth: 480, mx: 'auto', lineHeight: 1.7 }}>
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
          borderTop: `1.5px solid ${alpha(P[300], 0.32)}`,
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
              boxShadow: `0 20px 64px ${alpha(P[400], 0.22)}, 0 4px 16px ${alpha(P[500], 0.12)}`,
              border: `1px solid ${alpha(P[200], 0.5)}`,
            }}>
              {/* Browser chrome */}
              <Box sx={{
                bgcolor: '#F5F5F7', px: 2, py: 1.25,
                display: 'flex', alignItems: 'center', gap: 1,
                borderBottom: '1px solid #E5E5EA',
              }}>
                {['#FF5F57', '#FFBD2E', '#28C840'].map(c => (
                  <Box key={c} sx={{ width: 11, height: 11, borderRadius: '50%', bgcolor: c, flexShrink: 0 }} />
                ))}
                <Box sx={{
                  flex: 1, ml: 1.5, bgcolor: 'white', borderRadius: 2,
                  px: 1.5, py: 0.5, border: '1px solid #E0E0E0',
                  display: 'flex', alignItems: 'center',
                }}>
                  <Typography sx={{ fontSize: '0.62rem', color: '#9E9EA7', letterSpacing: '0.02em', fontFamily: '"DM Mono", monospace' }}>
                    embed.kannanao.app/deck/n5-vocab
                  </Typography>
                </Box>
              </Box>
              {/* Embedded card */}
              <Box sx={{ p: 2, bgcolor: alpha(V[50], 0.6) }}>
                <ThemeProvider theme={murasakiTheme}>
                  <EmbedFlashcard card={YUME_CARD} height={268} />
                </ThemeProvider>
              </Box>
              <Box sx={{ px: 2, py: 1.25, bgcolor: '#FAFAFA', borderTop: '1px solid #EFEFEF' }}>
                <Typography sx={{ fontSize: '0.62rem', color: '#9E9EA7', textAlign: 'center', fontFamily: '"DM Mono", monospace' }}>
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
              color: P[700], mb: 1.5, lineHeight: 1.08,
            }}>
              Share & embed<br />your decks
            </Typography>
            <Typography sx={{ fontSize: '0.97rem', color: alpha(P[700], 0.62), lineHeight: 1.8, mb: 3.5 }}>
              Share any deck with a single link — friends and classmates can study
              instantly with no account required. Or embed an interactive flashcard
              widget directly on your blog, Notion page, or website.
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {['🔗 One-click sharing', '🌐 Embeddable widget', '👥 Study together', '🔒 No account needed'].map(tag => (
                <Chip key={tag} label={tag} size="small" sx={{
                  bgcolor: alpha(P[50], 0.95), color: P[700], fontSize: '0.72rem',
                  border: `1px solid ${alpha(P[300], 0.55)}`, borderRadius: 4,
                }} />
              ))}
            </Stack>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ─── Section 5: CTA / Waitlist (Murasaki dark) ───────────────────────────────

function CtaSection({ session }: { session: unknown }) {
  const router = useRouter();
  const { ref, inView } = useInView(0.08);

  return (
    <Box id="waitlist" ref={ref} sx={{
      minHeight: '100vh',
      position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(160deg, #1A0A3C 0%, #2E1065 40%, #200B46 75%, #0f0624 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      py: { xs: 10, md: 8 },
      px: { xs: 2, sm: 4, md: 6 },
    }}>
      <Blob color={P[500]} size={560} top="-120px" right="-90px" opacity={0.18} blur={110} pulse />
      <Blob color={V[600]} size={440} bottom="-90px" left="-70px" opacity={0.16} blur={100} />
      <Blob color={S[500]} size={280} top="52%" left="32%" opacity={0.09} blur={80} />

      {/* Star field */}
      <Box sx={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.045) 1px, transparent 1px)',
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
          icon={<AutoAwesomeIcon sx={{ fontSize: '0.85rem !important', color: `${V[300]} !important` }} />}
          label="Closed beta — spots opening soon"
          size="small"
          sx={{
            mb: 3, bgcolor: alpha(V[400], 0.18), color: V[200],
            fontWeight: 700, fontSize: '0.72rem',
            border: `1px solid ${alpha(V[400], 0.38)}`, borderRadius: 6,
          }}
        />

        <Typography sx={{
          fontFamily: '"DM Serif Display", serif',
          fontSize: { xs: '2.6rem', sm: '3.4rem', md: '4.2rem' },
          color: 'white', lineHeight: 1.02, mb: 2.5,
        }}>
          Ready to fall in love<br />with Japanese?
        </Typography>

        <Typography sx={{
          fontSize: '1rem', color: alpha('#fff', 0.52),
          mb: 5, maxWidth: 520, mx: 'auto', lineHeight: 1.8,
        }}>
          Kannanao is currently in closed beta. Drop your email and we&apos;ll let
          you know the moment new sign-ups open.
        </Typography>

        {session ? (
          <Button variant="contained" size="large" onClick={() => router.push('/')}
            sx={{
              fontFamily: '"DM Serif Display", serif', fontSize: '1.1rem',
              textTransform: 'none', borderRadius: 8, px: 5, py: 1.6,
              background: `linear-gradient(135deg, ${P[400]} 0%, ${P[600]} 100%)`,
              boxShadow: `0 10px 36px ${alpha(P[500], 0.48)}`,
              '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 16px 48px ${alpha(P[500], 0.58)}` },
            }}>
            Go to dashboard 🌸
          </Button>
        ) : (
          <WaitlistForm />
        )}

        {/* Footer */}
        <Box sx={{ mt: 10, pt: 5, borderTop: `1px solid ${alpha('#fff', 0.08)}` }}>
          <Typography sx={{ fontFamily: '"DM Serif Display", serif', fontSize: '1.2rem', color: alpha('#fff', 0.55), mb: 0.5 }}>
            🌸 Kannanao
          </Typography>
          <Typography sx={{ fontSize: '0.78rem', color: alpha('#fff', 0.28) }}>
            AI-powered Japanese flashcard studio
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { session } = useAuth();

  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => { document.documentElement.style.scrollBehavior = ''; };
  }, []);

  return (
    <Box>
      <HeroSection session={session} />
      <FeaturesSection />
      <HowItWorksSection />
      <PracticeSection />
      <CtaSection session={session} />
    </Box>
  );
}

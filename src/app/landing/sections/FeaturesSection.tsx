'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import { alpha } from '@mui/material/styles';
import { purple, pink, sky, darkPurple } from '@/theme';
import { useInView } from './useInView';
import { Blob } from './Blob';

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
            fontFamily: (t) => t.fonts.display,
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
              <Typography sx={{ fontFamily: (t) => t.fonts.display, fontSize: '1.02rem', color: alpha(purple[200], 0.95), lineHeight: 1.2 }}>
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

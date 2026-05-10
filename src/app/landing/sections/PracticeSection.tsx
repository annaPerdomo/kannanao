'use client';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { emerald, pink, purple } from '@/theme';

import { Blob } from './Blob';
import { useInView } from './useInView';

const MODES = [
  {
    emoji: '🔗',
    title: 'Match',
    desc: 'Race the clock matching Japanese words to their meanings. Great for rapid-fire vocabulary drilling.',
    color: emerald[500],
    bg: alpha(emerald[100], 0.55),
    border: alpha(emerald[300], 0.55),
  },
  {
    emoji: '✏️',
    title: 'Fill in the blank',
    desc: 'Read a sentence and type the missing word. Builds reading comprehension alongside vocabulary.',
    color: purple[600],
    bg: alpha(purple[100], 0.6),
    border: alpha(purple[300], 0.55),
  },
  {
    emoji: '🧠',
    title: 'Recall',
    desc: 'See the meaning, type the Japanese. The hardest mode — and the best for long-term retention.',
    color: pink[600],
    bg: alpha(pink[100], 0.6),
    border: alpha(pink[300], 0.55),
  },
];

export function PracticeSection() {
  const { ref, inView } = useInView(0.1);

  return (
    <Box
      ref={ref}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(148deg, ${pink[50]} 0%, ${alpha(pink[100], 0.6)} 35%, ${alpha(purple[50], 0.75)} 70%, ${pink[50]} 100%)`,
        display: 'flex',
        alignItems: 'center',
        py: { xs: 10, md: 10 },
        px: { xs: 2, sm: 4, md: 6, lg: 8 },
      }}
    >
      <Blob color={pink[300]} size={440} top="-60px" left="-60px" opacity={0.28} blur={80} />
      <Blob color={purple[300]} size={380} bottom="-60px" right="-60px" opacity={0.22} blur={75} />

      <Box sx={{ maxWidth: 1220, mx: 'auto', width: '100%', position: 'relative', zIndex: 1 }}>
        <Box
          sx={{
            textAlign: 'center',
            mb: { xs: 5, md: 7 },
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(32px)',
            transition: 'opacity 0.8s ease, transform 0.8s ease',
          }}
        >
          <Typography
            component="h2"
            sx={{
              fontFamily: (t) => t.fonts.display,
              fontSize: { xs: '2.2rem', sm: '2.8rem', md: '3.4rem' },
              color: pink[700],
              mb: 1.5,
              lineHeight: 1.05,
            }}
          >
            Three ways to practice
          </Typography>
          <Typography
            sx={{
              fontSize: '1rem',
              color: alpha(pink[700], 0.6),
              maxWidth: 480,
              mx: 'auto',
              lineHeight: 1.7,
            }}
          >
            Switch between modes to keep sessions fresh and challenging. Each one earns XP toward
            your next level.
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
            gap: 2.5,
          }}
        >
          {MODES.map((m, i) => (
            <Paper
              key={m.title}
              elevation={0}
              sx={{
                p: 3.5,
                borderRadius: 5,
                background: m.bg,
                border: `1.5px solid ${m.border}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
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
              <Typography
                sx={{ fontFamily: (t) => t.fonts.display, fontSize: '1.3rem', color: m.color }}
              >
                {m.title}
              </Typography>
              <Typography sx={{ fontSize: '0.87rem', color: 'text.secondary', lineHeight: 1.72 }}>
                {m.desc}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

'use client';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { alpha, ThemeProvider } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { PublicFlashcard } from '@/components/PublicFlashcard';
import { createAppTheme, emerald, macChrome, pink, purple } from '@/theme';

import { Blob } from './Blob';
import { YUME_CARD } from './demoData';
import { useInView } from './useInView';

const murasakiTheme = createAppTheme('murasaki');

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
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(148deg, ${pink[50]} 0%, ${alpha(pink[100], 0.6)} 35%, ${alpha(purple[50], 0.75)} 70%, ${pink[50]} 100%)`,
        display: 'flex',
        alignItems: 'center',
        py: { xs: 10, md: 8 },
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
            sx={{
              fontFamily: (t) => t.fonts.display,
              fontSize: { xs: '2.2rem', sm: '2.8rem', md: '3.4rem' },
              color: pink[700],
              mb: 1.5,
              lineHeight: 1.05,
            }}
          >
            Three ways to practise
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
            mb: { xs: 9, md: 11 },
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

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: { xs: 6, md: 10 },
            alignItems: 'center',
            borderTop: `1.5px solid ${alpha(pink[300], 0.32)}`,
            pt: { xs: 7, md: 9 },
          }}
        >
          <Box
            sx={{
              flex: '0 0 auto',
              width: { xs: '100%', sm: 360 },
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateX(0)' : 'translateX(-36px)',
              transition: 'opacity 0.75s ease 0.3s, transform 0.75s ease 0.3s',
            }}
          >
            <Paper
              elevation={0}
              sx={{
                borderRadius: 4,
                overflow: 'hidden',
                boxShadow: `0 20px 64px ${alpha(pink[400], 0.22)}, 0 4px 16px ${alpha(pink[500], 0.12)}`,
                border: `1px solid ${alpha(pink[200], 0.5)}`,
              }}
            >
              <Box
                sx={{
                  bgcolor: macChrome.bar,
                  px: 2,
                  py: 1.25,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  borderBottom: `1px solid ${macChrome.border}`,
                }}
              >
                {[macChrome.red, macChrome.yellow, macChrome.green].map((c) => (
                  <Box
                    key={c}
                    sx={{ width: 11, height: 11, borderRadius: '50%', bgcolor: c, flexShrink: 0 }}
                  />
                ))}
                <Box
                  sx={{
                    flex: 1,
                    ml: 1.5,
                    bgcolor: macChrome.addressBg,
                    borderRadius: 2,
                    px: 1.5,
                    py: 0.5,
                    border: `1px solid ${macChrome.addressBorder}`,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '0.62rem',
                      color: macChrome.text,
                      letterSpacing: '0.02em',
                      fontFamily: (t) => t.fonts.mono,
                    }}
                  >
                    kannanao.com/embed/demo-yume
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ p: 2, bgcolor: alpha(purple[50], 0.6) }}>
                <ThemeProvider theme={murasakiTheme}>
                  <PublicFlashcard card={YUME_CARD} height={268} />
                </ThemeProvider>
              </Box>
              <Box
                sx={{
                  px: 2,
                  py: 1.25,
                  bgcolor: macChrome.footerBg,
                  borderTop: `1px solid ${macChrome.footerBorder}`,
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.62rem',
                    color: macChrome.text,
                    textAlign: 'center',
                    fontFamily: (t) => t.fonts.mono,
                  }}
                >
                  Powered by 🌸 Kannanao
                </Typography>
              </Box>
            </Paper>
          </Box>

          <Box
            sx={{
              flex: 1,
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateX(0)' : 'translateX(36px)',
              transition: 'opacity 0.75s ease 0.42s, transform 0.75s ease 0.42s',
            }}
          >
            <Typography
              sx={{
                fontFamily: (t) => t.fonts.display,
                fontSize: { xs: '2rem', sm: '2.6rem', md: '3rem' },
                color: pink[700],
                mb: 1.5,
                lineHeight: 1.08,
              }}
            >
              Share & embed
              <br />
              your decks
            </Typography>
            <Typography
              sx={{ fontSize: '0.97rem', color: alpha(pink[700], 0.62), lineHeight: 1.8, mb: 3.5 }}
            >
              Share any deck with a single link — friends and classmates can study instantly with no
              account required. Or embed an interactive flashcard widget directly on your blog,
              Notion page, or website.
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {[
                '🔗 One-click sharing',
                '🌐 Embeddable widget',
                '👥 Study together',
                '🔒 No account needed',
              ].map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  sx={{
                    bgcolor: alpha(pink[50], 0.95),
                    color: pink[700],
                    fontSize: '0.72rem',
                    border: `1px solid ${alpha(pink[300], 0.55)}`,
                    borderRadius: 4,
                  }}
                />
              ))}
            </Stack>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

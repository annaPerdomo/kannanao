'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { purple, sky } from '@/theme';

import { Blob } from './Blob';
import { useInView } from './useInView';

const STEPS = [
  {
    n: 1,
    emoji: '✍️',
    title: 'Create your decks',
    desc: 'Type a word and AI fills readings, meanings, and examples. Or upload a PDF to generate cards in bulk. Unsplash photos and furigana are added automatically.',
  },
  {
    n: 2,
    emoji: '🎮',
    title: 'Study your way',
    desc: 'Flip cards, play Match, Fill-in-the-blank, or Recall. Open Travel Mode for real-world phrases across 9 modules, or practice speeches line-by-line.',
  },
  {
    n: 3,
    emoji: '🎨',
    title: 'Earn & customise',
    desc: 'Every session earns XP. Level up to unlock colour themes, card borders, celebration effects, and study buddies from the shop.',
  },
  {
    n: 4,
    emoji: '👥',
    title: 'Learn together',
    desc: 'Create a group, invite members via QR code, assign decks with deadlines, climb the weekly leaderboard, and share or embed decks anywhere.',
  },
];

export function HowItWorksSection() {
  const { ref, inView } = useInView(0.1);

  return (
    <Box
      ref={ref}
      sx={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(148deg, ${sky[50]} 0%, ${sky[100]} 35%, ${alpha(sky[100], 0.5)} 65%, ${sky[50]} 100%)`,
        display: 'flex',
        alignItems: 'center',
        py: { xs: 10, md: 8 },
        px: { xs: 2, sm: 4, md: 6, lg: 8 },
      }}
    >
      <Blob color={sky[300]} size={520} top="-120px" right="-90px" opacity={0.28} blur={90} pulse />
      <Blob color={purple[300]} size={360} bottom="-30px" left="-70px" opacity={0.2} blur={80} />
      <Blob color={sky[200]} size={280} top="45%" left="45%" opacity={0.25} blur={60} />

      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage: `linear-gradient(${alpha(sky[300], 0.15)} 1px, transparent 1px), linear-gradient(90deg, ${alpha(sky[300], 0.15)} 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }}
      />

      <Box
        sx={{
          maxWidth: 1220,
          mx: 'auto',
          width: '100%',
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          gap: { xs: 8, lg: 14 },
          alignItems: 'center',
        }}
      >
        <Box
          sx={{
            flex: '0 0 auto',
            maxWidth: { lg: 360 },
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateX(0)' : 'translateX(-40px)',
            transition: 'opacity 0.8s ease, transform 0.8s ease',
          }}
        >
          <Typography
            component="h2"
            sx={{
              fontFamily: (t) => t.fonts.display,
              fontSize: { xs: '2.4rem', sm: '3rem', lg: '3.6rem' },
              color: sky[700],
              lineHeight: 1.05,
              mb: 2,
            }}
          >
            Up and running
            <br />
            in minutes
          </Typography>
          <Typography
            sx={{ fontSize: '1rem', color: alpha(sky[700], 0.62), lineHeight: 1.8, mb: 4 }}
          >
            No complicated setup. Create an account, build your first deck with AI, and start
            earning XP in minutes. Everything syncs automatically.
          </Typography>
          <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
            {[
              ['9', 'travel modules'],
              ['12+', 'achievements'],
              ['10', 'themes'],
            ].map(([n, label]) => (
              <Box key={label}>
                <Typography
                  sx={{
                    fontFamily: (t) => t.fonts.display,
                    fontSize: '2.6rem',
                    color: sky[600],
                    lineHeight: 1,
                  }}
                >
                  {n}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.72rem',
                    color: alpha(sky[700], 0.52),
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  {label}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>

        <Box sx={{ flex: 1 }}>
          {STEPS.map((s, i) => (
            <Box
              key={s.n}
              sx={{
                display: 'flex',
                gap: 3,
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateX(0)' : 'translateX(40px)',
                transition: `opacity 0.65s ease ${0.15 * i}s, transform 0.65s ease ${0.15 * i}s`,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flexShrink: 0,
                }}
              >
                <Box
                  sx={{
                    width: 54,
                    height: 54,
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${sky[400]} 0%, ${sky[600]} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 6px 24px ${alpha(sky[500], 0.42)}`,
                    flexShrink: 0,
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: (t) => t.fonts.display,
                      fontSize: '1.4rem',
                      color: '#fff',
                      lineHeight: 1,
                    }}
                  >
                    {s.n}
                  </Typography>
                </Box>
                {i < STEPS.length - 1 && (
                  <Box
                    sx={{
                      width: 2,
                      flex: 1,
                      minHeight: 40,
                      mt: 0.5,
                      background: `linear-gradient(180deg, ${sky[400]}, ${alpha(sky[300], 0.25)})`,
                      borderRadius: 2,
                    }}
                  />
                )}
              </Box>
              <Box sx={{ pb: i < STEPS.length - 1 ? 5 : 0, pt: 0.5 }}>
                <Typography
                  sx={{
                    fontFamily: (t) => t.fonts.display,
                    fontSize: '1.25rem',
                    color: sky[700],
                    mb: 0.75,
                  }}
                >
                  {s.emoji} {s.title}
                </Typography>
                <Typography
                  sx={{ fontSize: '0.9rem', color: alpha(sky[700], 0.62), lineHeight: 1.75 }}
                >
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

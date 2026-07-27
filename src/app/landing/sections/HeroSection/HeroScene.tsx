'use client';

import AutoAwesomeIcon from '@mui/icons-material/AutoAwesomeRounded';
import BoltIcon from '@mui/icons-material/BoltRounded';
import GroupsIcon from '@mui/icons-material/GroupsRounded';
import StreakIcon from '@mui/icons-material/LocalFireDepartmentRounded';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { alpha, ThemeProvider } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { CSSProperties, ReactNode } from 'react';

import { Flashcard } from '@/components/Flashcard';
import { amber, createAppTheme, pink, purple } from '@/theme';

import { SAKURA_CARD } from '../demoData';

const sakuraTheme = createAppTheme('sakura');

// Illustrative figures. They exist to show the shape of the product — a deck an
// educator assigned, the learners working through it — not to claim numbers.
const CLASS_ROWS = [
  { name: 'Hana', pct: 92 },
  { name: 'Ken', pct: 74 },
  { name: 'Yuki', pct: 61 },
];
const REVIEW_DONE = 8;
const REVIEW_TOTAL = 12;
const STREAK_DAYS = 5;

interface ScenePanelProps {
  accent: typeof pink;
  icon: ReactNode;
  title: string;
  tilt: number;
  delay: number;
  children: ReactNode;
}

// Outer holds the resting tilt, inner runs the keyframe — one `transform` each.
function ScenePanel({ accent, icon, title, tilt, delay, children }: ScenePanelProps) {
  return (
    <Box sx={{ flex: 1, minWidth: 0, transform: `rotate(${tilt}deg)` }}>
      <Box
        sx={{
          position: 'relative',
          p: { xs: 1.5, sm: 1.75 },
          borderRadius: 3,
          bgcolor: alpha('#fff', 0.94),
          border: `1.5px solid ${alpha(accent[200], 0.85)}`,
          boxShadow: `0 14px 34px ${alpha(accent[500], 0.18)}`,
          backdropFilter: 'blur(6px)',
          animation: `scenePanelIn 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s both`,
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          '@keyframes scenePanelIn': {
            from: { opacity: 0, transform: 'translateY(24px)' },
            to: { opacity: 1, transform: 'translateY(0)' },
          },
        }}
      >
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1.25 }}>
          <Box sx={{ display: 'flex', color: accent[500], '& svg': { fontSize: '1rem' } }}>
            {icon}
          </Box>
          <Typography
            sx={{
              fontSize: '0.68rem',
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: accent[700],
            }}
          >
            {title}
          </Typography>
        </Stack>
        {children}
      </Box>
    </Box>
  );
}

interface ProgressBarProps {
  pct: number;
  color: string;
  track: string;
  delay: number;
  height?: number;
}

// `--target-width` feeds the shared `progressFill` keyframe in LandingGlobalStyles.
function ProgressBar({ pct, color, track, delay, height = 6 }: ProgressBarProps) {
  return (
    <Box sx={{ flex: 1, height, borderRadius: 3, bgcolor: track, overflow: 'hidden' }}>
      <Box
        style={{ '--target-width': `${pct}%` } as CSSProperties}
        sx={{
          height: '100%',
          width: `${pct}%`,
          borderRadius: 3,
          background: color,
          animation: `progressFill 1.1s cubic-bezier(0.16,1,0.3,1) ${delay}s both`,
        }}
      />
    </Box>
  );
}

export function HeroScene() {
  const t = useTranslations('Landing.hero.scene');

  return (
    <Box sx={{ position: 'relative', width: '100%', maxWidth: 520, mx: 'auto' }}>
      <Box
        sx={{
          position: 'absolute',
          inset: '2% -8%',
          borderRadius: '50%',
          background: `radial-gradient(ellipse at center, ${alpha(pink[400], 0.34)} 0%, transparent 68%)`,
          filter: 'blur(44px)',
          pointerEvents: 'none',
        }}
      />

      {/* What the educator gets: a finished deck, seconds after asking for it. */}
      <Stack
        direction="row"
        spacing={0.75}
        alignItems="center"
        sx={{
          position: 'relative',
          width: 'fit-content',
          mx: { xs: 'auto', sm: 0 },
          mb: 1.5,
          px: 1.5,
          py: 0.75,
          borderRadius: 6,
          bgcolor: alpha('#fff', 0.94),
          border: `1.5px solid ${alpha(purple[200], 0.9)}`,
          boxShadow: `0 10px 26px ${alpha(purple[500], 0.2)}`,
          animation: 'chipPopIn 0.55s ease-out 0.35s both',
        }}
      >
        <AutoAwesomeIcon sx={{ fontSize: '0.95rem', color: purple[500] }} />
        <Typography sx={{ fontSize: '0.76rem', fontWeight: 700, color: purple[700] }}>
          {t('aiBadge')}
        </Typography>
      </Stack>

      <Box
        sx={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) minmax(0, 190px)' },
          gap: { xs: 2, sm: 1.75 },
          alignItems: 'start',
        }}
      >
        {/* The card itself — the real component, rendered in its own theme so it
            looks exactly like it does inside the app. */}
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            maxWidth: { xs: 300, sm: 'none' },
            justifySelf: { xs: 'center', sm: 'stretch' },
            animation: 'floatCard 7s ease-in-out infinite',
          }}
        >
          <ThemeProvider theme={sakuraTheme}>
            <Flashcard card={SAKURA_CARD} width="100%" height={372} />
          </ThemeProvider>

          <Box
            sx={{
              position: 'absolute',
              bottom: -46,
              left: { xs: -36, sm: -96 },
              width: { xs: 104, sm: 124 },
              zIndex: 2,
              pointerEvents: 'none',
              animation: 'gentleBounce 4.5s ease-in-out infinite',
            }}
          >
            <Image
              src="/mascot/wave.png"
              width={336}
              height={366}
              priority
              alt=""
              style={{ width: '100%', height: 'auto' }}
            />
          </Box>
        </Box>

        <Stack direction={{ xs: 'row', sm: 'column' }} spacing={{ xs: 1.5, sm: 1.75 }}>
          {/* What the educator sees back. */}
          <ScenePanel
            accent={purple}
            icon={<GroupsIcon />}
            title={t('classProgress')}
            tilt={1.5}
            delay={0.45}
          >
            <Stack spacing={1}>
              {CLASS_ROWS.map((row, i) => (
                <Stack key={row.name} direction="row" spacing={0.75} alignItems="center">
                  <Typography
                    sx={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: 'text.primary',
                      width: 34,
                      flexShrink: 0,
                    }}
                  >
                    {row.name}
                  </Typography>
                  <ProgressBar
                    pct={row.pct}
                    color={`linear-gradient(90deg, ${purple[400]}, ${purple[600]})`}
                    track={alpha(purple[100], 0.9)}
                    delay={0.7 + i * 0.12}
                  />
                  <Typography
                    sx={{ fontSize: '0.64rem', fontWeight: 700, color: purple[600], width: 26 }}
                  >
                    {row.pct}%
                  </Typography>
                </Stack>
              ))}
            </Stack>
            <Typography sx={{ mt: 1.25, fontSize: '0.64rem', color: 'text.secondary' }}>
              {t('assigned')}
            </Typography>
          </ScenePanel>

          {/* What the learner sees: today's queue, the streak that keeps them in it. */}
          <ScenePanel
            accent={pink}
            icon={<StreakIcon />}
            title={t('streak', { days: STREAK_DAYS })}
            tilt={-1.5}
            delay={0.6}
          >
            <Stack direction="row" spacing={0.5} sx={{ mb: 1.25 }}>
              {Array.from({ length: STREAK_DAYS + 2 }, (_, i) => (
                <Box
                  key={i}
                  sx={{
                    flex: 1,
                    height: 18,
                    borderRadius: 1.5,
                    bgcolor: i < STREAK_DAYS ? alpha(amber[400], 0.9) : alpha(pink[100], 0.9),
                  }}
                />
              ))}
            </Stack>

            <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: 'text.primary' }}>
              {t('todayReview')}
            </Typography>
            <Typography sx={{ fontSize: '0.64rem', color: 'text.secondary', mb: 0.75 }}>
              {t('reviewDone', { done: REVIEW_DONE, total: REVIEW_TOTAL })}
            </Typography>
            <ProgressBar
              pct={(REVIEW_DONE / REVIEW_TOTAL) * 100}
              color={`linear-gradient(90deg, ${pink[400]}, ${pink[600]})`}
              track={alpha(pink[100], 0.9)}
              delay={0.85}
              height={8}
            />

            <Stack
              direction="row"
              spacing={0.25}
              alignItems="center"
              sx={{
                position: 'absolute',
                top: -12,
                right: -10,
                px: 1,
                py: 0.25,
                borderRadius: 5,
                // 600→700, not 400→600: white on amber[400] is 2.2:1, which
                // this label is too small to get away with.
                color: '#fff',
                background: `linear-gradient(135deg, ${amber[600]}, ${amber[700]})`,
                boxShadow: `0 8px 18px ${alpha(amber[600], 0.4)}`,
                animation: 'gentleBounce 3.2s ease-in-out infinite',
              }}
            >
              <BoltIcon sx={{ fontSize: '0.8rem' }} />
              <Typography sx={{ fontSize: '0.68rem', fontWeight: 800 }}>+40 XP</Typography>
            </Stack>
          </ScenePanel>
        </Stack>
      </Box>
    </Box>
  );
}

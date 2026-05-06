'use client';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useEffect, useMemo, useState } from 'react';

import { ACHIEVEMENTS as ALL_ACHIEVEMENTS } from '@/hooks/useProgress';
import { SHOP_ITEMS as ALL_SHOP_ITEMS } from '@/hooks/useShop';
import { amber, emerald, lavender, ocean, pink, purple, rose, sky, slate, sunset } from '@/theme';

import { Blob } from './Blob';
import { useInView } from './useInView';

// Dynamic counts from actual data — exclude comingSoon items
const THEME_COUNT = ALL_SHOP_ITEMS.filter((i) => i.category === 'theme' && !i.comingSoon).length;
const BORDER_COUNT = ALL_SHOP_ITEMS.filter((i) => i.category === 'card_border').length;
const ACHIEVEMENT_COUNT = ALL_ACHIEVEMENTS.length;
const CATEGORIES = [...new Set(ALL_SHOP_ITEMS.map((i) => i.category))].length;

const DEMO_ACHIEVEMENTS = [
  { icon: '🌱', title: 'First Steps', desc: 'Study your first card', unlocked: true },
  { icon: '🔥', title: 'On Fire', desc: '7-day streak', unlocked: true },
  { icon: '🎯', title: 'Sharpshooter', desc: '95% accuracy', unlocked: true },
  { icon: '💯', title: 'Century', desc: '100 cards studied', unlocked: true },
  { icon: '⚡', title: 'Speed Demon', desc: 'Fast match mode', unlocked: false },
  { icon: '🏔️', title: 'Summit', desc: 'Reach level 10', unlocked: false },
];

// Mirrors the actual theme system — 10 named themes
const THEME_PREVIEWS = [
  { name: 'Sakura', colors: [pink[300], pink[500], pink[600]] },
  { name: 'Murasaki', colors: [purple[300], purple[500], purple[700]] },
  { name: 'Yuki', colors: [sky[200], sky[400], purple[400]] },
  { name: 'Ocean', colors: [ocean[300], ocean[500], ocean[700]] },
  { name: 'Forest', colors: [emerald[300], emerald[500], emerald[700]] },
  { name: 'Sunset', colors: [sunset[300], sunset[500], sunset[700]] },
  { name: 'Lavender', colors: [lavender[300], lavender[500], lavender[700]] },
  { name: 'Midnight', colors: [slate[400], slate[600], slate[800]] },
  { name: 'Matcha', colors: [emerald[200], emerald[400], emerald[600]] },
  { name: 'Rose Gold', colors: [rose[300], rose[400], amber[400]] },
];

// Real shop items — one from each category
const DEMO_SHOP_ITEMS = [
  { icon: '🌅', name: 'Sunset Orange', price: 2500, type: 'Themes' },
  { icon: '🌸', name: 'Cherry Blossom', price: 1500, type: 'Card Borders' },
  { icon: '⭐', name: 'Star Shower', price: 5000, type: 'Celebrations' },
  { icon: '🦊', name: 'Fox Buddy', price: 65000, type: 'Study Buddies' },
];

export function GamificationSection() {
  const { ref, inView } = useInView(0.06);
  // Deterministic alpha values for calendar cells to avoid hydration mismatches
  const calendarAlphas = useMemo(
    () => Array.from({ length: 14 }, (_, i) => 0.3 + ((i * 7 + 3) % 10) * 0.04),
    [],
  );
  const [xpProgress, setXpProgress] = useState(0);
  const [badgesShown, setBadgesShown] = useState(0);
  const [activeTheme, setActiveTheme] = useState(0);
  const [celebrationBurst, setCelebrationBurst] = useState(false);

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;

    // Animate XP bar
    const xpTimer = setTimeout(() => {
      if (!cancelled) setXpProgress(72);
    }, 400);

    // Animate badges
    let count = 0;
    const badgeTimer = setInterval(() => {
      if (cancelled) {
        clearInterval(badgeTimer);
        return;
      }
      count++;
      setBadgesShown(count);
      if (count >= DEMO_ACHIEVEMENTS.length) clearInterval(badgeTimer);
    }, 250);

    // Cycle themes
    const themeTimer = setInterval(() => {
      if (!cancelled) setActiveTheme((t) => (t + 1) % THEME_PREVIEWS.length);
    }, 2000);

    // Celebration burst
    let burstTimeout: ReturnType<typeof setTimeout>;
    const celebTimer = setInterval(() => {
      if (!cancelled) {
        setCelebrationBurst(true);
        burstTimeout = setTimeout(() => setCelebrationBurst(false), 800);
      }
    }, 5000);

    return () => {
      cancelled = true;
      clearTimeout(xpTimer);
      clearInterval(badgeTimer);
      clearInterval(themeTimer);
      clearInterval(celebTimer);
      clearTimeout(burstTimeout);
    };
  }, [inView]);

  return (
    <Box
      ref={ref}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(160deg, ${amber[50]} 0%, ${sunset[50]} 30%, ${alpha(amber[50], 0.5)} 65%, ${pink[50]} 100%)`,
        py: { xs: 10, md: 12 },
        px: { xs: 2, sm: 4, md: 6, lg: 8 },
      }}
    >
      <Blob
        color={amber[300]}
        size={480}
        top="-100px"
        left="-80px"
        opacity={0.22}
        blur={90}
        pulse
      />
      <Blob color={sunset[300]} size={360} bottom="-50px" right="-60px" opacity={0.2} blur={80} />
      <Blob color={pink[200]} size={240} top="50%" right="30%" opacity={0.18} blur={60} />

      {/* Floating celebration particles */}
      {celebrationBurst &&
        ['🎉', '⭐', '✨', '🌟', '💫'].map((emoji, i) => (
          <Typography
            key={`${emoji}-${i}`}
            sx={{
              position: 'absolute',
              fontSize: { xs: 20, md: 28 },
              left: `${20 + i * 15}%`,
              top: '30%',
              animation: 'floatUp 1.5s ease-out forwards',
              animationDelay: `${i * 0.1}s`,
              pointerEvents: 'none',
              zIndex: 2,
            }}
          >
            {emoji}
          </Typography>
        ))}

      <Box sx={{ maxWidth: 1220, mx: 'auto', width: '100%', position: 'relative', zIndex: 1 }}>
        <Box
          sx={{
            textAlign: 'center',
            mb: { xs: 6, md: 7 },
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(32px)',
            transition: 'opacity 0.8s ease, transform 0.8s ease',
          }}
        >
          <Typography
            component="h2"
            sx={{
              fontFamily: (t) => t.fonts.display,
              fontSize: { xs: '2.2rem', sm: '3rem', md: '3.8rem' },
              color: amber[800],
              mb: 1.5,
              lineHeight: 1.05,
            }}
          >
            Every session earns XP.
            <br />
            Every level unlocks more.
          </Typography>
          <Typography
            sx={{
              fontSize: '1rem',
              color: alpha(amber[800], 0.6),
              maxWidth: 560,
              mx: 'auto',
              lineHeight: 1.7,
            }}
          >
            Study earns XP. XP unlocks themes, card borders, celebration effects, and study buddies.
            Achievements mark your milestones. It&apos;s learning that feels like a game.
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '5fr 4fr 4fr' },
            gap: 2.5,
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.8s ease 0.15s, transform 0.8s ease 0.15s',
          }}
        >
          {/* XP & Stats — matches actual StatCard component */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 4,
              bgcolor: alpha(amber[50], 0.6),
              border: `1px solid ${alpha(amber[300], 0.4)}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 2.5,
            }}
          >
            {/* Level indicator — like actual app header */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${amber[400]} 0%, ${sunset[500]} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 4px 14px ${alpha(amber[500], 0.35)}`,
                  animation: celebrationBurst ? 'gentleBounce 0.5s ease' : 'none',
                }}
              >
                <Typography
                  sx={{
                    fontSize: '1.4rem',
                    fontFamily: (t) => t.fonts.cute,
                    color: 'common.white',
                  }}
                >
                  7
                </Typography>
              </Box>
              <Box>
                <Typography
                  sx={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: amber[600],
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  Level 7
                </Typography>
                <Typography
                  sx={{ fontSize: '1.3rem', fontWeight: 900, color: amber[800], lineHeight: 1.2 }}
                >
                  2,450 XP
                </Typography>
              </Box>
            </Box>

            {/* XP progress bar */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
                  Progress to Level 8
                </Typography>
                <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: amber[600] }}>
                  {xpProgress}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={xpProgress}
                sx={{
                  height: 10,
                  borderRadius: 5,
                  bgcolor: alpha(amber[200], 0.4),
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 5,
                    background: `linear-gradient(90deg, ${amber[400]} 0%, ${sunset[500]} 100%)`,
                    transition: 'transform 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
                  },
                }}
              />
            </Box>

            {/* Stat cards row — mirrors actual StatCard */}
            <Stack direction="row" spacing={1.5}>
              {[
                { icon: '🔥', label: 'Streak', value: '12', sub: 'days' },
                { icon: '🎯', label: 'Accuracy', value: '94%', sub: 'avg' },
                { icon: '📚', label: 'Cards', value: '342', sub: 'studied' },
              ].map((stat) => (
                <Paper
                  key={stat.label}
                  elevation={0}
                  sx={{
                    flex: 1,
                    p: 1.5,
                    borderRadius: 3,
                    bgcolor: alpha(amber[50], 0.8),
                    border: `1px solid ${alpha(amber[200], 0.5)}`,
                    textAlign: 'center',
                  }}
                >
                  <Typography sx={{ fontSize: '1.1rem', mb: 0.25 }}>{stat.icon}</Typography>
                  <Typography
                    sx={{
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      fontFamily: (t) => t.fonts.cute,
                      color: amber[700],
                    }}
                  >
                    {stat.value}
                  </Typography>
                  <Typography sx={{ fontSize: '0.55rem', color: 'text.secondary' }}>
                    {stat.sub}
                  </Typography>
                </Paper>
              ))}
            </Stack>

            {/* Study calendar hint */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 0.5,
              }}
            >
              {Array.from({ length: 14 }).map((_, i) => (
                <Box
                  key={i}
                  sx={{
                    aspectRatio: '1',
                    borderRadius: 1,
                    bgcolor: [0, 1, 2, 3, 5, 6, 7, 8, 9, 11, 12, 13].includes(i)
                      ? alpha(amber[400], calendarAlphas[i])
                      : alpha(amber[100], 0.3),
                    transition: 'all 0.3s ease',
                  }}
                />
              ))}
            </Box>
          </Paper>

          {/* Achievements — matches badge display in Stats page */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 4,
              bgcolor: alpha(purple[50], 0.5),
              border: `1px solid ${alpha(purple[200], 0.4)}`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
              <Typography sx={{ fontSize: '1rem' }}>🏅</Typography>
              <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, color: purple[700] }}>
                Achievements
              </Typography>
              <Chip
                label="4/12"
                size="small"
                sx={{
                  ml: 'auto',
                  height: 20,
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  bgcolor: alpha(purple[100], 0.6),
                  color: purple[600],
                }}
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.25 }}>
              {DEMO_ACHIEVEMENTS.map((a, i) => (
                <Box
                  key={a.title}
                  sx={{
                    textAlign: 'center',
                    p: 1.25,
                    borderRadius: 3,
                    border: `1.5px solid ${a.unlocked ? alpha(purple[300], 0.5) : alpha(purple[100], 0.3)}`,
                    bgcolor: a.unlocked ? alpha(purple[50], 0.6) : 'transparent',
                    opacity: badgesShown > i ? 1 : 0,
                    transform: badgesShown > i ? 'scale(1)' : 'scale(0.7)',
                    transition: `all 0.4s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.05}s`,
                    filter: a.unlocked ? 'none' : 'grayscale(0.8)',
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '1.5rem',
                      lineHeight: 1,
                      mb: 0.5,
                      opacity: a.unlocked ? 1 : 0.4,
                    }}
                  >
                    {a.icon}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '0.58rem',
                      fontWeight: 700,
                      color: a.unlocked ? purple[700] : 'text.secondary',
                      lineHeight: 1.2,
                    }}
                  >
                    {a.title}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>

          {/* Themes & Shop — mirrors ShopItemCard layout */}
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 4,
              bgcolor: alpha(pink[50], 0.5),
              border: `1px solid ${alpha(pink[200], 0.4)}`,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, color: pink[700], mb: 2 }}>
              🎨 Customize Everything
            </Typography>

            {/* Theme swatches — like actual theme selector */}
            <Box sx={{ mb: 2 }}>
              <Typography
                sx={{ fontSize: '0.62rem', color: 'text.secondary', mb: 1, fontWeight: 600 }}
              >
                10 COLOR THEMES
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                {THEME_PREVIEWS.map((t, i) => (
                  <Box
                    key={t.name}
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '8px',
                      background: `linear-gradient(135deg, ${t.colors[0]} 0%, ${t.colors[2]} 100%)`,
                      border:
                        i === activeTheme ? `2.5px solid ${t.colors[1]}` : `2px solid transparent`,
                      boxShadow:
                        i === activeTheme
                          ? `0 0 0 2px ${alpha(t.colors[1], 0.3)}, 0 4px 12px ${alpha(t.colors[1], 0.35)}`
                          : 'none',
                      transform: i === activeTheme ? 'scale(1.2)' : 'scale(1)',
                      transition: 'all 0.4s cubic-bezier(0.34,1.56,0.64,1)',
                    }}
                  />
                ))}
              </Box>
              <Typography
                sx={{ fontSize: '0.6rem', color: 'text.secondary', mt: 0.75, fontStyle: 'italic' }}
              >
                {THEME_PREVIEWS[activeTheme].name}
              </Typography>
            </Box>

            {/* Shop items — like actual ShopItemCard */}
            <Stack spacing={0.75} sx={{ flex: 1 }}>
              {DEMO_SHOP_ITEMS.map((item) => (
                <Box
                  key={item.name}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 1,
                    borderRadius: 2.5,
                    border: `1px solid ${alpha(pink[200], 0.4)}`,
                    bgcolor: alpha(pink[50], 0.3),
                    '&:hover': {
                      bgcolor: alpha(pink[100], 0.5),
                      borderColor: alpha(pink[300], 0.6),
                      transform: 'translateX(4px)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '8px',
                      bgcolor: alpha(pink[100], 0.5),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.1rem',
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      noWrap
                      sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'text.primary' }}
                    >
                      {item.name}
                    </Typography>
                    <Typography sx={{ fontSize: '0.58rem', color: 'text.secondary' }}>
                      {item.type}
                    </Typography>
                  </Box>
                  <Chip
                    label={`⭐ ${item.price}`}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      bgcolor: alpha(amber[100], 0.8),
                      color: amber[700],
                      border: `1px solid ${alpha(amber[300], 0.5)}`,
                    }}
                  />
                </Box>
              ))}
            </Stack>
          </Paper>
        </Box>

        {/* Bottom counter row */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={3}
          justifyContent="center"
          alignItems="center"
          sx={{
            mt: 5,
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.8s ease 0.4s, transform 0.8s ease 0.4s',
          }}
        >
          {[
            { n: String(THEME_COUNT), label: 'color themes' },
            { n: String(BORDER_COUNT), label: 'card borders' },
            { n: String(ACHIEVEMENT_COUNT), label: 'achievements' },
            { n: String(CATEGORIES), label: 'shop categories' },
          ].map((s) => (
            <Box key={s.label} sx={{ textAlign: 'center', px: 3 }}>
              <Typography
                sx={{
                  fontFamily: (t) => t.fonts.cute,
                  fontSize: '2.4rem',
                  color: amber[700],
                  lineHeight: 1,
                }}
              >
                {s.n}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.68rem',
                  color: 'text.secondary',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                {s.label}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}

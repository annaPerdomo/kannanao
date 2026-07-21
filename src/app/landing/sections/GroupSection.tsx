'use client';

import AssignmentIcon from '@mui/icons-material/AssignmentRounded';
import EmojiEventsIcon from '@mui/icons-material/EmojiEventsRounded';
import FavoriteIcon from '@mui/icons-material/FavoriteRounded';
import GroupsIcon from '@mui/icons-material/GroupsRounded';
import LinkIcon from '@mui/icons-material/LinkRounded';
import LockOpenIcon from '@mui/icons-material/LockOpenRounded';
import MenuBookIcon from '@mui/icons-material/MenuBookRounded';
import PublicIcon from '@mui/icons-material/PublicRounded';
import QrCode2Icon from '@mui/icons-material/QrCode2Rounded';
import RestaurantIcon from '@mui/icons-material/RestaurantRounded';
import WavingHandIcon from '@mui/icons-material/WavingHandRounded';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { alpha, ThemeProvider } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { PublicFlashcard } from '@/components/PublicFlashcard';
import { useInView } from '@/hooks/useInView';
import { APP_DOMAIN } from '@/lib/brand';
import { createAppTheme, emerald, macChrome, ocean, pink, purple, sky } from '@/theme';

import { Blob } from './Blob';
import { YUME_CARD } from './demoData';

const murasakiTheme = createAppTheme('murasaki');

// Mirrors actual LeaderboardWidget data shape
const LEADERBOARD = [
  { name: 'Yuki', xp: 1240, level: 8, streak: 14, cards: 89 },
  { name: 'Haru', xp: 980, level: 6, streak: 9, cards: 67 },
  { name: 'Ren', xp: 870, level: 5, streak: 7, cards: 52 },
  { name: 'Aoi', xp: 650, level: 4, streak: 5, cards: 38 },
  { name: 'Sora', xp: 520, level: 3, streak: 3, cards: 24 },
];

const ASSIGNMENTS = [
  { key: 'jlptN5Verbs', progress: 80, Icon: MenuBookIcon },
  { key: 'dailyGreetings', progress: 45, Icon: WavingHandIcon },
  { key: 'foodAndDrinks', progress: 20, Icon: RestaurantIcon },
];

const ENCOURAGEMENTS = [{ key: 'greatStreak' }, { key: 'masteredVerbs' }];

const SHARE_TAGS = [
  { key: 'oneClickSharing', Icon: LinkIcon },
  { key: 'embeddableWidget', Icon: PublicIcon },
  { key: 'noAccountNeeded', Icon: LockOpenIcon },
];

const PILLS = [
  { key: 'oneClickSharing', Icon: LinkIcon },
  { key: 'organizerMemberRoles', Icon: GroupsIcon },
  { key: 'assignDecksWithDeadlines', Icon: AssignmentIcon },
  { key: 'weeklyXpLeaderboard', Icon: EmojiEventsIcon },
  { key: 'sendEncouragements', Icon: FavoriteIcon },
  { key: 'qrCodeInvites', Icon: QrCode2Icon },
];

export function GroupSection() {
  const t = useTranslations('Landing.group');
  const { ref, inView } = useInView(0.06);
  const [leaderboardVisible, setLeaderboardVisible] = useState(0);
  const [showEncouragements, setShowEncouragements] = useState(false);

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;

    let count = 0;
    const timer = setInterval(() => {
      if (cancelled) {
        clearInterval(timer);
        return;
      }
      count++;
      setLeaderboardVisible(count);
      if (count >= LEADERBOARD.length) clearInterval(timer);
    }, 300);

    const encTimer = setTimeout(() => {
      if (!cancelled) setShowEncouragements(true);
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(timer);
      clearTimeout(encTimer);
    };
  }, [inView]);

  return (
    <Box
      ref={ref}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(160deg, ${ocean[50]} 0%, ${sky[50]} 35%, ${alpha(ocean[50], 0.5)} 65%, ${purple[50]} 100%)`,
        py: { xs: 10, md: 12 },
        px: { xs: 2, sm: 4, md: 6, lg: 8 },
      }}
    >
      <Blob
        color={ocean[300]}
        size={500}
        top="-100px"
        left="-90px"
        opacity={0.22}
        blur={90}
        pulse
      />
      <Blob color={sky[300]} size={380} bottom="-60px" right="-70px" opacity={0.2} blur={80} />
      <Blob color={purple[200]} size={240} top="40%" right="20%" opacity={0.16} blur={60} />

      <Box sx={{ maxWidth: 1220, mx: 'auto', width: '100%', position: 'relative', zIndex: 1 }}>
        {/* Section header */}
        <Box
          sx={{
            textAlign: 'center',
            mb: { xs: 6, md: 7 },
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(32px)',
            transition: 'opacity 0.8s ease, transform 0.8s ease',
          }}
        >
          <Chip
            label={t('badge')}
            size="small"
            sx={{
              mb: 2,
              bgcolor: alpha(ocean[500], 0.12),
              color: ocean[700],
              fontWeight: 800,
              fontSize: '0.65rem',
              letterSpacing: '0.12em',
              border: `1px solid ${alpha(ocean[400], 0.4)}`,
              borderRadius: 4,
            }}
          />
          <Typography
            component="h2"
            sx={{
              fontFamily: (t) => t.fonts.display,
              fontSize: { xs: '2.2rem', sm: '3rem', md: '3.8rem' },
              color: ocean[800],
              mb: 1.5,
              lineHeight: 1.05,
            }}
          >
            {t('heading')}
          </Typography>
          <Typography
            sx={{
              fontSize: '1rem',
              color: alpha(ocean[800], 0.6),
              maxWidth: 560,
              mx: 'auto',
              lineHeight: 1.7,
            }}
          >
            {t('subheading')}
          </Typography>
        </Box>

        {/* ── Share & Embed ── */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: { xs: 5, md: 6 },
            alignItems: 'center',
            mb: { xs: 7, md: 9 },
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.8s ease 0.1s, transform 0.8s ease 0.1s',
          }}
        >
          <Box
            sx={{
              flex: '0 0 auto',
              width: { xs: '100%', sm: 340 },
            }}
          >
            <Paper
              elevation={0}
              sx={{
                borderRadius: 4,
                overflow: 'hidden',
                boxShadow: `0 16px 48px ${alpha(ocean[400], 0.18)}, 0 4px 12px ${alpha(ocean[500], 0.1)}`,
                border: `1px solid ${alpha(ocean[200], 0.5)}`,
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
                    {APP_DOMAIN}/embed/demo-yume
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ p: 2, bgcolor: alpha(purple[50], 0.6) }}>
                <ThemeProvider theme={murasakiTheme}>
                  <PublicFlashcard card={YUME_CARD} height={240} />
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
                  {t('poweredBy')}
                </Typography>
              </Box>
            </Paper>
          </Box>

          <Box sx={{ flex: 1 }}>
            <Typography
              component="h3"
              sx={{
                fontFamily: (t) => t.fonts.display,
                fontSize: { xs: '1.8rem', sm: '2.2rem' },
                color: ocean[800],
                mb: 1.5,
                lineHeight: 1.1,
              }}
            >
              {t('shareHeading')}
            </Typography>
            <Typography
              sx={{ fontSize: '0.95rem', color: alpha(ocean[800], 0.6), lineHeight: 1.8, mb: 3 }}
            >
              {t('shareBody')}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {SHARE_TAGS.map(({ key, Icon }) => (
                <Chip
                  key={key}
                  icon={
                    <Icon
                      sx={{ fontSize: '0.95rem !important', color: `${ocean[500]} !important` }}
                    />
                  }
                  label={t(`shareTags.${key}`)}
                  size="small"
                  sx={{
                    bgcolor: alpha(ocean[50], 0.95),
                    color: ocean[700],
                    fontWeight: 600,
                    fontSize: '0.72rem',
                    border: `1px solid ${alpha(ocean[300], 0.55)}`,
                    borderRadius: 4,
                    pl: 0.5,
                  }}
                />
              ))}
            </Stack>
          </Box>
        </Box>

        {/* ── Group features heading ── */}
        <Box
          sx={{
            textAlign: 'center',
            mb: { xs: 4, md: 5 },
            pt: { xs: 5, md: 6 },
            borderTop: `1.5px solid ${alpha(ocean[300], 0.25)}`,
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.8s ease 0.2s, transform 0.8s ease 0.2s',
          }}
        >
          <Typography
            component="h3"
            sx={{
              fontFamily: (t) => t.fonts.display,
              fontSize: { xs: '1.6rem', sm: '2rem', md: '2.4rem' },
              color: ocean[800],
              mb: 1,
              lineHeight: 1.1,
            }}
          >
            {t('groupHeading')}
          </Typography>
          <Typography
            sx={{
              fontSize: '0.92rem',
              color: alpha(ocean[800], 0.55),
              maxWidth: 480,
              mx: 'auto',
              lineHeight: 1.7,
            }}
          >
            {t('groupSubheading')}
          </Typography>
        </Box>

        {/* ── Three-column group features ── */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
            gap: 2.5,
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.8s ease 0.25s, transform 0.8s ease 0.25s',
          }}
        >
          {/* Leaderboard */}
          <Paper
            elevation={0}
            sx={{
              borderRadius: 4,
              overflow: 'hidden',
              border: `1px solid ${alpha(ocean[300], 0.35)}`,
              bgcolor: alpha(ocean[50], 0.3),
            }}
          >
            <Box
              sx={{
                px: 2.5,
                py: 1.5,
                background: `linear-gradient(135deg, ${ocean[500]} 0%, ${sky[600]} 100%)`,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <EmojiEventsIcon sx={{ fontSize: '1.05rem', color: 'common.white' }} />
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 800, color: 'common.white' }}>
                {t('leaderboard.title')}
              </Typography>
            </Box>
            <Box sx={{ p: 1.5 }}>
              <Stack spacing={0.75}>
                {LEADERBOARD.map((member, i) => {
                  const medals = ['🥇', '🥈', '🥉'];
                  return (
                    <Paper
                      key={member.name}
                      elevation={0}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.25,
                        p: 1,
                        borderRadius: 2,
                        bgcolor: i === 0 ? alpha(ocean[100], 0.5) : alpha(ocean[50], 0.3),
                        border: `1px solid ${alpha(ocean[300], i === 0 ? 0.5 : 0.25)}`,
                        opacity: leaderboardVisible > i ? 1 : 0,
                        transform: leaderboardVisible > i ? 'translateX(0)' : 'translateX(-16px)',
                        transition: `opacity 0.35s ease ${i * 0.08}s, transform 0.35s ease ${i * 0.08}s`,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: i < 3 ? '1.2rem' : '0.75rem',
                          width: 24,
                          textAlign: 'center',
                        }}
                      >
                        {i < 3 ? medals[i] : `${i + 1}`}
                      </Typography>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          noWrap
                          sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'text.primary' }}
                        >
                          {member.name}
                        </Typography>
                        <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
                          {t('leaderboard.levelStreak', {
                            level: member.level,
                            streak: member.streak,
                          })}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography
                          sx={{ fontSize: '0.78rem', fontWeight: 800, color: ocean[700] }}
                        >
                          {member.xp.toLocaleString()}
                        </Typography>
                        <Typography sx={{ fontSize: '0.55rem', color: 'text.secondary' }}>
                          {t('leaderboard.cards', { count: member.cards })}
                        </Typography>
                      </Box>
                    </Paper>
                  );
                })}
              </Stack>
            </Box>
          </Paper>

          {/* Assignments */}
          <Paper
            elevation={0}
            sx={{
              borderRadius: 4,
              overflow: 'hidden',
              border: `1px solid ${alpha(purple[200], 0.35)}`,
              bgcolor: alpha(purple[50], 0.3),
            }}
          >
            <Box
              sx={{
                px: 2.5,
                py: 1.5,
                background: `linear-gradient(135deg, ${purple[500]} 0%, ${pink[500]} 100%)`,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <AssignmentIcon sx={{ fontSize: '1.05rem', color: 'common.white' }} />
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 800, color: 'common.white' }}>
                {t('assignments.title')}
              </Typography>
            </Box>
            <Box sx={{ p: 2 }}>
              <Stack spacing={1.25}>
                {ASSIGNMENTS.map((a) => (
                  <Paper
                    key={a.key}
                    elevation={0}
                    sx={{
                      p: 1.5,
                      borderRadius: 3,
                      bgcolor: alpha(purple[50], 0.5),
                      border: `1.5px solid ${alpha(purple[200], 0.4)}`,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
                      <a.Icon sx={{ fontSize: '1.15rem', color: purple[500] }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          sx={{ fontSize: '0.78rem', fontWeight: 700, color: 'text.primary' }}
                        >
                          {t(`assignments.items.${a.key}.deck`)}
                        </Typography>
                        <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
                          {t('assignments.dueLabel', {
                            due: t(`assignments.items.${a.key}.due`),
                          })}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={a.progress}
                        sx={{
                          flex: 1,
                          height: 6,
                          borderRadius: 3,
                          bgcolor: alpha(purple[200], 0.5),
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 3,
                            background: `linear-gradient(90deg, ${purple[400]} 0%, ${pink[400]} 100%)`,
                          },
                        }}
                      />
                      <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: purple[600] }}>
                        {a.progress}%
                      </Typography>
                    </Box>
                  </Paper>
                ))}
              </Stack>
            </Box>
          </Paper>

          {/* Encouragements & Invite */}
          <Paper
            elevation={0}
            sx={{
              borderRadius: 4,
              overflow: 'hidden',
              border: `1px solid ${alpha(emerald[200], 0.35)}`,
              bgcolor: alpha(emerald[50], 0.3),
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box
              sx={{
                px: 2.5,
                py: 1.5,
                background: `linear-gradient(135deg, ${emerald[500]} 0%, ${ocean[500]} 100%)`,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <FavoriteIcon sx={{ fontSize: '1.05rem', color: 'common.white' }} />
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 800, color: 'common.white' }}>
                {t('encouragements.title')}
              </Typography>
            </Box>
            <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Stack spacing={1.25} sx={{ flex: 1 }}>
                {ENCOURAGEMENTS.map((e, i) => (
                  <Paper
                    key={e.key}
                    elevation={0}
                    sx={{
                      p: 1.5,
                      borderRadius: 3,
                      bgcolor: alpha(emerald[50], 0.5),
                      border: `1px solid ${alpha(emerald[200], 0.4)}`,
                      opacity: showEncouragements ? 1 : 0,
                      transform: showEncouragements ? 'translateY(0)' : 'translateY(12px)',
                      transition: `opacity 0.5s ease ${i * 0.2}s, transform 0.5s ease ${i * 0.2}s`,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: 0.5,
                      }}
                    >
                      <Typography
                        sx={{ fontSize: '0.68rem', fontWeight: 700, color: emerald[700] }}
                      >
                        {t(`encouragements.items.${e.key}.from`)}
                      </Typography>
                      <Typography sx={{ fontSize: '0.55rem', color: 'text.secondary' }}>
                        {t(`encouragements.items.${e.key}.time`)}
                      </Typography>
                    </Box>
                    <Typography
                      sx={{ fontSize: '0.75rem', color: 'text.primary', lineHeight: 1.5 }}
                    >
                      {t(`encouragements.items.${e.key}.message`)}
                    </Typography>
                  </Paper>
                ))}
              </Stack>

              {/* QR invite */}
              <Box
                sx={{
                  mt: 2,
                  pt: 2,
                  borderTop: `1px solid ${alpha(emerald[200], 0.4)}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: 2,
                    border: `2px solid ${alpha(ocean[400], 0.4)}`,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gridTemplateRows: 'repeat(5, 1fr)',
                    gap: '2px',
                    p: '5px',
                    flexShrink: 0,
                    animation: 'pulseGlow 3s ease-in-out infinite',
                  }}
                >
                  {Array.from({ length: 25 }).map((_, i) => (
                    <Box
                      key={i}
                      sx={{
                        borderRadius: 0.5,
                        bgcolor: [0, 1, 2, 4, 5, 6, 10, 12, 14, 18, 20, 22, 23, 24].includes(i)
                          ? ocean[600]
                          : alpha(ocean[100], 0.5),
                      }}
                    />
                  ))}
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: ocean[700] }}>
                    {t('encouragements.qrTitle')}
                  </Typography>
                  <Typography
                    sx={{ fontSize: '0.62rem', color: 'text.secondary', lineHeight: 1.4 }}
                  >
                    {t('encouragements.qrSubtitle')}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Box>

        {/* Feature pills */}
        <Stack
          direction="row"
          spacing={1}
          flexWrap="wrap"
          useFlexGap
          justifyContent="center"
          sx={{
            mt: 5,
            opacity: inView ? 1 : 0,
            transition: 'opacity 0.8s ease 0.5s',
          }}
        >
          {PILLS.map(({ key, Icon }) => (
            <Chip
              key={key}
              icon={
                <Icon sx={{ fontSize: '0.95rem !important', color: `${ocean[500]} !important` }} />
              }
              label={t(`pills.${key}`)}
              size="small"
              sx={{
                bgcolor: alpha(ocean[50], 0.95),
                color: ocean[700],
                fontWeight: 600,
                fontSize: '0.72rem',
                border: `1px solid ${alpha(ocean[300], 0.5)}`,
                borderRadius: 4,
                pl: 0.5,
              }}
            />
          ))}
        </Stack>
      </Box>
    </Box>
  );
}

'use client';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { useInView } from '@/hooks/useInView';
import { darkPurple, pink, purple, sky } from '@/theme';

import { Blob } from './Blob';

const FEATURES = [
  { key: 'classroomGroups', emoji: '🏫' },
  { key: 'dailyReview', emoji: '🔁' },
  { key: 'threePracticeModes', emoji: '🎮' },
  { key: 'gradedQuizzes', emoji: '📝' },
  { key: 'aiCardGeneration', emoji: '🤖' },
  { key: 'pdfImport', emoji: '📄' },
  { key: 'travelMode', emoji: '✈️' },
  { key: 'speechPractice', emoji: '🎤' },
  { key: 'streaksAndAchievements', emoji: '🔥' },
  { key: 'leaderboard', emoji: '🏆' },
  { key: 'themesAndShop', emoji: '🎨' },
  { key: 'shareAndEmbed', emoji: '🤝' },
];

export function FeaturesSection() {
  const t = useTranslations('Landing.features');
  const { ref, inView } = useInView(0.08);

  return (
    <Box
      ref={ref}
      sx={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(160deg, ${darkPurple.base} 0%, ${darkPurple.mid} 40%, ${darkPurple.deeper} 75%, ${darkPurple.deepest} 100%)`,
        display: 'flex',
        alignItems: 'center',
        py: { xs: 10, md: 8 },
        px: { xs: 2, sm: 4, md: 6, lg: 8 },
      }}
    >
      <Blob
        color={purple[600]}
        size={640}
        top="-160px"
        left="-120px"
        opacity={0.18}
        blur={110}
        pulse
      />
      <Blob color={pink[500]} size={420} bottom="-80px" right="-80px" opacity={0.14} blur={90} />
      <Blob color={sky[500]} size={300} top="45%" left="55%" opacity={0.09} blur={80} />

      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage: `radial-gradient(circle, ${alpha('#fff', 0.055)} 1px, transparent 1px)`,
          backgroundSize: '46px 46px',
        }}
      />

      <Box sx={{ maxWidth: 1220, mx: 'auto', width: '100%', position: 'relative', zIndex: 1 }}>
        <Box
          sx={{
            textAlign: 'center',
            mb: { xs: 6, md: 8 },
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
              color: 'white',
              mb: 1.5,
              lineHeight: 1.05,
            }}
          >
            {t.rich('heading', { br: () => <br /> })}
          </Typography>
          <Typography
            sx={{
              fontSize: '1rem',
              color: alpha('#fff', 0.5),
              maxWidth: 540,
              mx: 'auto',
              lineHeight: 1.7,
            }}
          >
            {t('subheading')}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 2,
          }}
        >
          {FEATURES.map((f, i) => (
            <Paper
              key={f.key}
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 4,
                background: alpha('#fff', 0.05),
                border: `1px solid ${alpha('#fff', 0.09)}`,
                backdropFilter: 'blur(14px)',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
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
              <Typography
                sx={{
                  fontFamily: (t) => t.fonts.display,
                  fontSize: '1.02rem',
                  color: alpha(purple[200], 0.95),
                  lineHeight: 1.2,
                }}
              >
                {t(`items.${f.key}.title`)}
              </Typography>
              <Typography
                sx={{ fontSize: '0.82rem', color: alpha('#fff', 0.48), lineHeight: 1.65 }}
              >
                {t(`items.${f.key}.desc`)}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

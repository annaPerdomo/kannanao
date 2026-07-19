'use client';

import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { alpha, ThemeProvider } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Flashcard } from '@/components/Flashcard';
import { useAuth } from '@/contexts/AuthContext';
import { useInView } from '@/hooks/useInView';
import { amber, createAppTheme, pink, purple, sky } from '@/theme';

import { Blob } from './Blob';
import { SAKURA_CARD } from './demoData';
import { SakuraFallEffect } from './SakuraFallEffect';

const sakuraTheme = createAppTheme('sakura');

const TAG_KEYS = [
  'classrooms',
  'dailyReview',
  'aiPowered',
  'quizzes',
  'travelMode',
  'gamified',
] as const;

export function HeroSection() {
  const router = useRouter();
  const { session } = useAuth();
  const { ref, inView } = useInView(0.05);
  const t = useTranslations('Landing.hero');

  return (
    <Box
      ref={ref}
      sx={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(148deg, ${pink[50]} 0%, ${pink[100]} 30%, ${alpha(pink[50], 0.6)} 60%, ${pink[50]} 100%)`,
        display: 'flex',
        alignItems: 'center',
        pt: { xs: 14, md: 12 },
        pb: { xs: 10, md: 10 },
        px: { xs: 2, sm: 4, md: 6, lg: 8 },
        '@keyframes floatCard': {
          '0%,100%': { transform: 'translateY(0px) rotate(-1.5deg)' },
          '50%': { transform: 'translateY(-18px) rotate(0.8deg)' },
        },
        '@keyframes scrollBounce': {
          '0%,100%': { transform: 'translateX(-50%) translateY(0)' },
          '50%': { transform: 'translateX(-50%) translateY(10px)' },
        },
      }}
    >
      <SakuraFallEffect />

      <Blob
        color={pink[300]}
        size={560}
        top="-120px"
        right="-100px"
        opacity={0.22}
        blur={90}
        pulse
      />
      <Blob color={purple[300]} size={380} bottom="-40px" left="-70px" opacity={0.18} blur={80} />
      <Blob color={pink[200]} size={260} top="35%" right="18%" opacity={0.28} blur={55} />

      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage: `radial-gradient(circle, ${alpha(pink[400], 0.1)} 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
          zIndex: 0,
        }}
      />

      <Box
        sx={{
          maxWidth: 1220,
          mx: 'auto',
          width: '100%',
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          alignItems: 'center',
          gap: { xs: 7, lg: 10 },
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Box
          sx={{
            flex: 1,
            textAlign: { xs: 'center', lg: 'left' },
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateX(0)' : 'translateX(-48px)',
            transition:
              'opacity 0.9s cubic-bezier(0.16,1,0.3,1), transform 0.9s cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          <Chip
            icon={
              <AutoAwesomeIcon
                sx={{ fontSize: '0.85rem !important', color: `${amber[700]} !important` }}
              />
            }
            label={t('waitlistBadge')}
            size="small"
            sx={{
              mb: 3,
              bgcolor: alpha(amber[400], 0.12),
              color: amber[700],
              fontWeight: 700,
              fontSize: '0.72rem',
              border: `1px solid ${alpha(amber[400], 0.35)}`,
              borderRadius: 6,
            }}
          />

          <Typography
            component="h1"
            sx={{
              fontFamily: (t) => t.fonts.display,
              fontSize: { xs: '3.4rem', sm: '4.2rem', lg: '5.2rem' },
              lineHeight: 0.98,
              mb: 2.5,
              background: `linear-gradient(135deg, ${pink[600]} 0%, ${purple[500]} 50%, ${sky[500]} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {t.rich('headline', { br: () => <br /> })}
          </Typography>

          <Typography
            sx={{
              fontSize: { xs: '1rem', sm: '1.15rem' },
              color: alpha(pink[700], 0.72),
              lineHeight: 1.8,
              mb: 4,
              maxWidth: 520,
              mx: { xs: 'auto', lg: 0 },
            }}
          >
            {t.rich('subtitle', { em: (chunks) => <em>{chunks}</em> })}
          </Typography>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            justifyContent={{ xs: 'center', lg: 'flex-start' }}
            sx={{ mb: 3.5 }}
          >
            {session ? (
              <Button
                variant="contained"
                size="large"
                onClick={() => router.push('/')}
                sx={{
                  fontFamily: (t) => t.fonts.display,
                  fontSize: '1.05rem',
                  textTransform: 'none',
                  borderRadius: 8,
                  px: 4,
                  py: 1.5,
                  background: `linear-gradient(135deg, ${pink[400]} 0%, ${pink[600]} 100%)`,
                  boxShadow: `0 8px 28px ${alpha(pink[500], 0.42)}`,
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: `0 14px 40px ${alpha(pink[500], 0.52)}`,
                  },
                }}
              >
                {t('dashboardButton')}
              </Button>
            ) : (
              <>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() =>
                    document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })
                  }
                  sx={{
                    fontFamily: (t) => t.fonts.display,
                    fontSize: '1.05rem',
                    textTransform: 'none',
                    borderRadius: 8,
                    px: 4,
                    py: 1.5,
                    background: `linear-gradient(135deg, ${pink[400]} 0%, ${pink[600]} 100%)`,
                    boxShadow: `0 8px 28px ${alpha(pink[500], 0.42)}`,
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: `0 14px 40px ${alpha(pink[500], 0.52)}`,
                    },
                  }}
                >
                  {t('waitlistButton')}
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => router.push('/login')}
                  sx={{
                    fontFamily: (t) => t.fonts.display,
                    fontSize: '1.05rem',
                    textTransform: 'none',
                    borderRadius: 8,
                    px: 3.5,
                    py: 1.5,
                    borderColor: alpha(pink[400], 0.6),
                    color: pink[700],
                    '&:hover': { borderColor: pink[500], bgcolor: alpha(pink[100], 0.6) },
                  }}
                >
                  {t('signInButton')}
                </Button>
              </>
            )}
          </Stack>

          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            useFlexGap
            justifyContent={{ xs: 'center', lg: 'flex-start' }}
          >
            {TAG_KEYS.map((key) => (
              <Chip
                key={key}
                label={t(`tags.${key}`)}
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

        <Box
          sx={{
            flex: '0 0 auto',
            width: { xs: '100%', sm: 390, lg: 430 },
            position: 'relative',
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateX(0)' : 'translateX(48px)',
            transition:
              'opacity 0.9s cubic-bezier(0.16,1,0.3,1) 0.18s, transform 0.9s cubic-bezier(0.16,1,0.3,1) 0.18s',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: '8% 4%',
              borderRadius: 8,
              background: `radial-gradient(ellipse at center, ${alpha(pink[400], 0.38)} 0%, transparent 70%)`,
              filter: 'blur(36px)',
              pointerEvents: 'none',
            }}
          />
          <Box sx={{ animation: 'floatCard 7s ease-in-out infinite', position: 'relative' }}>
            <ThemeProvider theme={sakuraTheme}>
              <Flashcard card={SAKURA_CARD} height={450} />
            </ThemeProvider>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          position: 'absolute',
          bottom: 28,
          left: '50%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.75,
          animation: 'scrollBounce 2.2s ease-in-out infinite',
          opacity: 0.5,
          pointerEvents: 'none',
        }}
      >
        <Typography
          sx={{
            fontSize: '0.6rem',
            letterSpacing: '0.22em',
            color: pink[600],
            textTransform: 'uppercase',
          }}
        >
          {t('scroll')}
        </Typography>
        <Box
          sx={{
            width: 1.5,
            height: 36,
            background: `linear-gradient(180deg, ${pink[500]}, transparent)`,
            borderRadius: 2,
          }}
        />
      </Box>
    </Box>
  );
}

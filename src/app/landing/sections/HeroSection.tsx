'use client';

import AutoAwesomeIcon from '@mui/icons-material/AutoAwesomeRounded';
import FlightIcon from '@mui/icons-material/FlightRounded';
import PsychologyIcon from '@mui/icons-material/PsychologyRounded';
import QuizIcon from '@mui/icons-material/QuizRounded';
import ReplayIcon from '@mui/icons-material/ReplayRounded';
import SchoolIcon from '@mui/icons-material/SchoolRounded';
import SportsEsportsIcon from '@mui/icons-material/SportsEsportsRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { alpha, ThemeProvider } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Image from 'next/image';
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

const TAGS = [
  { key: 'aiPowered', Icon: AutoAwesomeIcon },
  { key: 'spacedRepetition', Icon: PsychologyIcon },
  { key: 'dailyReview', Icon: ReplayIcon },
  { key: 'quizzes', Icon: QuizIcon },
  { key: 'travelMode', Icon: FlightIcon },
  { key: 'gamified', Icon: SportsEsportsIcon },
] as const;

const scrollTo = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

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
                  onClick={() => scrollTo('for-educators')}
                  startIcon={<SchoolIcon />}
                  sx={{
                    fontFamily: (t) => t.fonts.display,
                    fontSize: '1.05rem',
                    textTransform: 'none',
                    borderRadius: 8,
                    px: 4,
                    py: 1.5,
                    background: `linear-gradient(135deg, ${purple[400]} 0%, ${purple[600]} 100%)`,
                    boxShadow: `0 8px 28px ${alpha(purple[500], 0.42)}`,
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: `0 14px 40px ${alpha(purple[500], 0.52)}`,
                    },
                  }}
                >
                  {t('educatorButton')}
                </Button>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => scrollTo('for-learners')}
                  startIcon={<SportsEsportsIcon />}
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
                  {t('learnerButton')}
                </Button>
              </>
            )}
          </Stack>

          {!session && (
            <Button
              onClick={() => scrollTo('waitlist')}
              sx={{
                mb: 3,
                mt: -1.5,
                textTransform: 'none',
                fontSize: '0.88rem',
                fontWeight: 700,
                color: pink[600],
                '&:hover': { bgcolor: alpha(pink[100], 0.5) },
              }}
            >
              {t('waitlistLink')}
            </Button>
          )}

          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            useFlexGap
            justifyContent={{ xs: 'center', lg: 'flex-start' }}
          >
            {TAGS.map(({ key, Icon }) => (
              <Chip
                key={key}
                icon={
                  <Icon sx={{ fontSize: '0.95rem !important', color: `${pink[500]} !important` }} />
                }
                label={t(`tags.${key}`)}
                size="small"
                sx={{
                  bgcolor: alpha(pink[50], 0.95),
                  color: pink[700],
                  fontWeight: 600,
                  fontSize: '0.72rem',
                  border: `1px solid ${alpha(pink[300], 0.55)}`,
                  borderRadius: 4,
                  pl: 0.5,
                }}
              />
            ))}
          </Stack>
        </Box>

        <Box
          sx={{
            flex: '0 0 auto',
            width: 320,
            maxWidth: '100%',
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
              inset: '4% -6%',
              borderRadius: 8,
              background: `radial-gradient(ellipse at center, ${alpha(pink[400], 0.38)} 0%, transparent 70%)`,
              filter: 'blur(36px)',
              pointerEvents: 'none',
            }}
          />
          <Box sx={{ animation: 'floatCard 7s ease-in-out infinite', position: 'relative' }}>
            <ThemeProvider theme={sakuraTheme}>
              <Flashcard card={SAKURA_CARD} width={320} height={452} />
            </ThemeProvider>
          </Box>
          <Box
            sx={{
              position: 'absolute',
              bottom: -18,
              left: { xs: -14, sm: -66 },
              width: { xs: 118, sm: 150 },
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

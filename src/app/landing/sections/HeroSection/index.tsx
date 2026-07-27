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
import { alpha, type Theme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { useAuth } from '@/contexts/AuthContext';
import { amber, pink, purple } from '@/theme';

import { Blob } from '../Blob';
import { SakuraFallEffect } from '../SakuraFallEffect';
import { HeroScene } from './HeroScene';

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

// `flex: 1` on xs makes the pair split the row evenly rather than sizing to
// their labels, which differ in width between en and ja.
const HERO_CTA_SX = {
  fontFamily: (theme: Theme) => theme.fonts.display,
  fontSize: { xs: '0.85rem', sm: '1.05rem' },
  textTransform: 'none',
  borderRadius: 8,
  px: { xs: 1.25, sm: 4 },
  py: { xs: 1.15, sm: 1.5 },
  flex: { xs: 1, sm: '0 0 auto' },
  whiteSpace: 'nowrap',
  '& .MuiButton-startIcon': { mr: { xs: 0.5, sm: 1 } },
  '&:hover': { transform: 'translateY(-3px)' },
} as const;

export function HeroSection() {
  const router = useRouter();
  const { session } = useAuth();
  const t = useTranslations('Landing.hero');

  return (
    <Box
      sx={{
        // svh, not vh: `100vh` on iOS Safari is the URL-bar-collapsed viewport,
        // so a vh-tall hero is always taller than what you can actually see.
        minHeight: '100svh',
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(148deg, ${pink[50]} 0%, ${pink[100]} 30%, ${alpha(pink[50], 0.6)} 60%, ${pink[50]} 100%)`,
        display: 'flex',
        alignItems: { xs: 'flex-start', lg: 'center' },
        pt: { xs: 2.5, sm: 6, md: 12 },
        pb: { xs: 6, md: 10 },
        px: { xs: 2, sm: 4, md: 6, lg: 8 },
        // The headline is the LCP element, so its entrance must run from CSS
        // (not useInView) and must not touch opacity — Chrome ignores a
        // candidate while opacity is 0, which pins LCP to hydration.
        '@keyframes heroTextIn': {
          from: { transform: 'translateX(-48px)' },
          to: { transform: 'translateX(0)' },
        },
        '@keyframes heroSceneIn': {
          from: { transform: 'translateX(48px)' },
          to: { transform: 'translateX(0)' },
        },
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
          gap: { xs: 3.5, sm: 6, lg: 8 },
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            // The parent centers its children, which sizes them to content, and
            // the tag strip below is `nowrap` — without this the column inherits
            // the strip's 600px max-content and bleeds off both phone edges.
            width: { xs: '100%', lg: 'auto' },
            textAlign: { xs: 'center', lg: 'left' },
            animation: 'heroTextIn 0.9s cubic-bezier(0.16,1,0.3,1) both',
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
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
              mb: { xs: 1.75, sm: 3 },
              bgcolor: alpha(amber[400], 0.12),
              color: amber[700],
              fontWeight: 700,
              fontSize: { xs: '0.68rem', sm: '0.72rem' },
              border: `1px solid ${alpha(amber[400], 0.35)}`,
              borderRadius: 6,
            }}
          />

          <Typography
            component="h1"
            sx={{
              fontSize: { xs: '2.55rem', sm: '3.6rem', lg: '4.7rem' },
              lineHeight: 1.02,
              mb: { xs: 1.75, sm: 2.5 },
              background: `linear-gradient(120deg, ${purple[600]} 0%, ${purple[500]} 30%, ${pink[500]} 70%, ${pink[600]} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {t.rich('headline', { br: () => <br /> })}
          </Typography>

          <Typography
            sx={{
              fontSize: { xs: '0.95rem', sm: '1.1rem' },
              color: alpha(pink[700], 0.72),
              lineHeight: { xs: 1.55, sm: 1.75 },
              mb: { xs: 2.5, sm: 4 },
              maxWidth: { xs: 340, sm: 500 },
              mx: { xs: 'auto', lg: 0 },
            }}
          >
            {t.rich('subtitle', { em: (chunks) => <em>{chunks}</em> })}
          </Typography>

          <Stack
            direction="row"
            spacing={{ xs: 1, sm: 1.5 }}
            justifyContent={{ xs: 'center', lg: 'flex-start' }}
            sx={{ mb: { xs: 2, sm: 3.5 } }}
          >
            {session ? (
              <Button
                variant="contained"
                size="large"
                onClick={() => router.push('/')}
                sx={{
                  ...HERO_CTA_SX,
                  background: `linear-gradient(135deg, ${pink[400]} 0%, ${pink[600]} 100%)`,
                  boxShadow: `0 8px 28px ${alpha(pink[500], 0.42)}`,
                  '&:hover': {
                    ...HERO_CTA_SX['&:hover'],
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
                    ...HERO_CTA_SX,
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
                    ...HERO_CTA_SX,
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
                mb: { xs: 1.5, sm: 3 },
                mt: { xs: -0.75, sm: -1.5 },
                textTransform: 'none',
                fontSize: { xs: '0.82rem', sm: '0.88rem' },
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
            flexWrap={{ xs: 'nowrap', sm: 'wrap' }}
            useFlexGap
            justifyContent={{ xs: 'flex-start', sm: 'center', lg: 'flex-start' }}
            sx={{
              overflowX: { xs: 'auto', sm: 'visible' },
              mx: { xs: -2, sm: 0 },
              px: { xs: 2, sm: 0 },
              pb: { xs: 0.5, sm: 0 },
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
              maskImage: {
                xs: 'linear-gradient(90deg, transparent 0, #000 12px, #000 calc(100% - 24px), transparent 100%)',
                sm: 'none',
              },
            }}
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
                  flexShrink: 0,
                }}
              />
            ))}
          </Stack>
        </Box>

        {/* The whole product in one glance: a deck the AI wrote, the card a
            learner studies, and the progress both sides get back. */}
        <Box
          sx={{
            flex: { lg: '0 0 520px' },
            width: '100%',
            maxWidth: 520,
            animation: 'heroSceneIn 0.9s cubic-bezier(0.16,1,0.3,1) 0.18s both',
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}
        >
          <HeroScene />
        </Box>
      </Box>

      <Box
        sx={{
          position: 'absolute',
          bottom: 28,
          left: '50%',
          // Hidden on phones, where the scene already fills the fold and the cue
          // lands on top of it.
          display: { xs: 'none', md: 'flex' },
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

'use client';

import SchoolIcon from '@mui/icons-material/SchoolRounded';
import SportsEsportsIcon from '@mui/icons-material/SportsEsportsRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { alpha, type SxProps, type Theme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { useAuth } from '@/contexts/AuthContext';
import { pink, purple } from '@/theme';

const scrollTo = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

function WaitlistLink({ sx }: { sx?: SxProps<Theme> }) {
  const t = useTranslations('Landing.hero');

  return (
    <Button
      onClick={() => scrollTo('waitlist')}
      sx={[
        {
          textTransform: 'none',
          fontSize: { xs: '0.82rem', sm: '0.88rem' },
          fontWeight: 700,
          color: pink[700],
          textShadow: '0 1px 3px rgba(255,255,255,0.9), 0 1px 10px rgba(255,255,255,0.7)',
          borderRadius: 99,
          px: 1.5,
          // Below lg the link lands on bare artwork — usually a friend's face —
          // so it carries its own pill; inside the desktop card it needs none.
          // No backdrop-filter: at 0.85 there is nothing left to blur, and it
          // would promote the pill to its own layer under SakuraDrift.
          bgcolor: { xs: alpha('#fff', 0.85), lg: 'transparent' },
          transition: 'background-color 0.2s ease',
          '&:hover': { bgcolor: alpha('#fff', 0.86) },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {t('waitlistLink')}
    </Button>
  );
}

const CTAS = [
  {
    key: 'educator',
    Icon: SchoolIcon,
    target: 'for-educators',
    accent: purple,
    titleKey: 'educatorButton',
    descKey: 'educatorCardDesc',
  },
  {
    key: 'learner',
    Icon: SportsEsportsIcon,
    target: 'for-learners',
    accent: pink,
    titleKey: 'learnerButton',
    descKey: 'learnerCardDesc',
  },
] as const;

interface PillCtaProps {
  accent: typeof pink;
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}

function PillCta({ accent, icon, title, description, onClick }: PillCtaProps) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        textAlign: 'left',
        cursor: 'pointer',
        border: 'none',
        px: { xs: 2, sm: 2.25 },
        py: 1.25,
        borderRadius: 99,
        color: '#fff',
        background: `linear-gradient(135deg, ${accent[400]} 0%, ${accent[600]} 100%)`,
        boxShadow: `0 10px 28px ${alpha(accent[500], 0.38)}`,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: `0 16px 38px ${alpha(accent[500], 0.5)}`,
        },
      }}
    >
      <Box
        sx={{
          display: 'inline-flex',
          p: 0.9,
          borderRadius: '50%',
          bgcolor: alpha('#fff', 0.22),
          '& svg': { fontSize: '1.2rem', display: 'block' },
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography
          sx={{
            fontFamily: (theme: Theme) => theme.fonts.display,
            fontSize: { xs: '0.9rem', sm: '0.98rem' },
            fontWeight: 800,
            lineHeight: 1.15,
          }}
        >
          {title}
        </Typography>
        <Typography sx={{ fontSize: '0.68rem', color: alpha('#fff', 0.88), lineHeight: 1.3 }}>
          {description}
        </Typography>
      </Box>
    </Box>
  );
}

export function HeroCtas() {
  const router = useRouter();
  const { session } = useAuth();
  const t = useTranslations('Landing.hero');

  if (session) {
    return (
      <Button
        variant="contained"
        size="large"
        onClick={() => router.push('/')}
        sx={{
          fontFamily: (theme: Theme) => theme.fonts.display,
          fontSize: { xs: '0.95rem', sm: '1.05rem' },
          textTransform: 'none',
          borderRadius: 8,
          px: 4,
          py: 1.5,
          mb: { xs: 2, sm: 3.5 },
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
    );
  }

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={{ xs: 1.25, sm: 1.25 }}
      useFlexGap
      flexWrap="wrap"
      sx={{
        alignItems: { xs: 'stretch', sm: 'center' },
        justifyContent: { xs: 'center', lg: 'flex-start' },
        maxWidth: { xs: 320, sm: 'none' },
        mx: { xs: 'auto', lg: 0 },
      }}
    >
      {CTAS.map(({ key, Icon, target, accent, titleKey, descKey }) => (
        <PillCta
          key={key}
          accent={accent}
          icon={<Icon />}
          title={t(titleKey)}
          description={t(descKey)}
          onClick={() => scrollTo(target)}
        />
      ))}
      {/* Full-width flex break: the link always gets its own row instead of
          wrapping beside a pill onto whichever friend sits there. */}
      <Box sx={{ flexBasis: '100%', height: 0, display: { xs: 'none', sm: 'block' } }} />
      {/* Negative `mt` tucks the link under the pills: the card's bottom padding
          is deliberately thin (it would clip the painted friends), so the link
          has to come up to leave its hover pill clearance from the card's edge.
          `alignSelf` keeps the stacked Stack from stretching the pill into what
          reads as a third button. */}
      <WaitlistLink sx={{ alignSelf: { xs: 'center', sm: 'auto' }, mt: { lg: -1.25 } }} />
    </Stack>
  );
}

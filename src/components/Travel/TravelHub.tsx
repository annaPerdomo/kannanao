'use client';

import FlightIcon from '@mui/icons-material/Flight';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PanToolIcon from '@mui/icons-material/PanTool';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import TodayIcon from '@mui/icons-material/Today';
import TranslateIcon from '@mui/icons-material/Translate';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { alpha, Box, Container, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { logTravelEvent } from '@/lib/supabase';
import { LAYOUT } from '@/theme';

import { TravelDisplayToggle } from './TravelDisplayToggle';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  href: string;
  badge?: string;
  locked?: boolean;
}

function FeatureCard({
  title,
  description,
  icon,
  gradient,
  href,
  badge,
  locked,
}: FeatureCardProps) {
  const t = useTranslations('Travel.hub');
  const router = useRouter();
  const theme = useTheme();
  const { brand } = theme.palette;

  const handleClick = () => {
    if (!locked) router.push(href);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <Box
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-disabled={locked || undefined}
      sx={{
        position: 'relative',
        cursor: locked ? 'default' : 'pointer',
        borderRadius: '16px',
        overflow: 'hidden',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        bgcolor: 'background.paper',
        border: `1px solid ${alpha(brand[300], 0.2)}`,
        boxShadow: `0 1px 3px ${alpha(brand[400], 0.08)}`,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 2,
        ...(locked && { opacity: 0.6 }),
        ...(!locked && {
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: `0 8px 24px ${alpha(brand[400], 0.15)}`,
            borderColor: alpha(brand[400], 0.35),
            '& .feature-icon': {
              transform: 'scale(1.08)',
            },
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        }),
      }}
    >
      {/* Icon */}
      <Box
        className="feature-icon"
        sx={{
          width: 48,
          height: 48,
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: locked ? `linear-gradient(135deg, ${brand[300]}, ${brand[400]})` : gradient,
          flexShrink: 0,
          transition: 'transform 0.25s ease',
          boxShadow: `0 2px 8px ${alpha(brand[500], 0.2)}`,
          '& .MuiSvgIcon-root': {
            fontSize: 22,
            color: '#fff',
          },
        }}
      >
        {locked ? <LockOutlinedIcon /> : icon}
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: '0.92rem',
              color: locked ? 'text.secondary' : 'text.primary',
              lineHeight: 1.3,
            }}
          >
            {title}
          </Typography>
          {badge && (
            <Box
              sx={{
                px: 1,
                py: 0.125,
                borderRadius: '6px',
                fontSize: '0.6rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                background: locked
                  ? `linear-gradient(135deg, ${brand[300]}, ${brand[400]})`
                  : `linear-gradient(135deg, ${brand[500]}, ${brand[700]})`,
                color: '#fff',
                lineHeight: 1.4,
              }}
            >
              {badge}
            </Box>
          )}
        </Box>
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            lineHeight: 1.4,
            fontSize: '0.78rem',
            mt: 0.25,
          }}
        >
          {description}
        </Typography>
        {locked && (
          <Typography
            variant="caption"
            sx={{
              color: 'text.disabled',
              fontSize: '0.68rem',
              lineHeight: 1.3,
            }}
          >
            {t('signInToUnlock')}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export function TravelHub() {
  const t = useTranslations('Travel.hub');
  const router = useRouter();
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const { user } = useAuth();
  const isGuest = !user;

  useEffect(() => {
    logTravelEvent('hub', 'view');
  }, []);

  const aiBadge = t('aiBadge');

  const features: FeatureCardProps[] = [
    {
      title: t('features.culture.title'),
      description: t('features.culture.description'),
      icon: (
        <Typography sx={{ fontSize: 20, lineHeight: 1, filter: 'brightness(0) invert(1)' }}>
          ⛩️
        </Typography>
      ),
      gradient: `linear-gradient(135deg, #dc2626, #991b1b)`,
      href: '/travel/culture',
    },
    {
      title: t('features.dailyPhrase.title'),
      description: t('features.dailyPhrase.description'),
      icon: <TodayIcon />,
      gradient: `linear-gradient(135deg, ${brand[500]}, ${brand[700]})`,
      href: '/travel/daily',
      badge: aiBadge,
      locked: isGuest,
    },
    {
      title: t('features.scenarios.title'),
      description: t('features.scenarios.description'),
      icon: <RecordVoiceOverIcon />,
      gradient: `linear-gradient(135deg, #7c3aed, #5b21b6)`,
      href: '/travel/scenarios',
      badge: aiBadge,
      locked: isGuest,
    },
    {
      title: t('features.pointCommunicate.title'),
      description: t('features.pointCommunicate.description'),
      icon: <PanToolIcon />,
      gradient: `linear-gradient(135deg, ${accent[500]}, ${accent[700]})`,
      href: '/travel/show-cards',
      badge: aiBadge,
      locked: isGuest,
    },
    {
      title: t('features.heard.title'),
      description: t('features.heard.description'),
      icon: <VolumeUpIcon />,
      gradient: `linear-gradient(135deg, #0891b2, #0e7490)`,
      href: '/travel/heard',
    },
    {
      title: t('features.food.title'),
      description: t('features.food.description'),
      icon: <RestaurantIcon />,
      gradient: `linear-gradient(135deg, #ea580c, #c2410c)`,
      href: '/travel/food',
    },
    {
      title: t('features.katakana.title'),
      description: t('features.katakana.description'),
      icon: <TranslateIcon />,
      gradient: `linear-gradient(135deg, #10b981, #059669)`,
      href: '/travel/katakana',
    },
    {
      title: t('features.phrases.title'),
      description: t('features.phrases.description'),
      icon: <MenuBookIcon />,
      gradient: `linear-gradient(135deg, #6366f1, #4f46e5)`,
      href: '/travel/phrases',
    },
    {
      title: t('features.emergency.title'),
      description: t('features.emergency.description'),
      icon: <LocalHospitalIcon />,
      gradient: `linear-gradient(135deg, #dc2626, #b91c1c)`,
      href: '/travel/emergency',
      locked: isGuest,
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 4 }, px: { xs: 2, sm: 3 } }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box sx={{ maxWidth: LAYOUT.headerMaxWidth, mx: 'auto', width: '100%' }}>
          <PageHeader
            icon={<FlightIcon />}
            title={t('title')}
            subtitle={t('subtitle')}
            onBack={() => router.push('/')}
            mb={0}
            endContent={<TravelDisplayToggle />}
          />
        </Box>

        {/* Feature Cards */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
            },
            gap: 1.5,
          }}
        >
          {features.map((feature) => (
            <FeatureCard key={feature.href} {...feature} />
          ))}
        </Box>
      </Stack>
    </Container>
  );
}

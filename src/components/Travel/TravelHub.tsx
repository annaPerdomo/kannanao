'use client';

import FlightIcon from '@mui/icons-material/Flight';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
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

import { TravelDisplayToggle } from './TravelDisplayToggle';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  href: string;
  badge?: string;
}

function FeatureCard({ title, description, icon, gradient, href, badge }: FeatureCardProps) {
  const router = useRouter();
  const theme = useTheme();
  const { brand } = theme.palette;

  return (
    <Box
      onClick={() => router.push(href)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          router.push(href);
        }
      }}
      sx={{
        position: 'relative',
        cursor: 'pointer',
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
          background: gradient,
          flexShrink: 0,
          transition: 'transform 0.25s ease',
          boxShadow: `0 2px 8px ${alpha(brand[500], 0.2)}`,
          '& .MuiSvgIcon-root': {
            fontSize: 22,
            color: '#fff',
          },
        }}
      >
        {icon}
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: '0.92rem',
              color: 'text.primary',
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
                background: `linear-gradient(135deg, ${brand[500]}, ${brand[700]})`,
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
      </Box>
    </Box>
  );
}

export function TravelHub() {
  const theme = useTheme();
  const { brand, accent } = theme.palette;

  const features: FeatureCardProps[] = [
    {
      title: 'Culture Guide',
      description: "Etiquette essentials, do's & don'ts, and tips for a smoother trip.",
      icon: (
        <Typography sx={{ fontSize: 20, lineHeight: 1, filter: 'brightness(0) invert(1)' }}>
          ⛩️
        </Typography>
      ),
      gradient: `linear-gradient(135deg, #dc2626, #991b1b)`,
      href: '/travel/culture',
    },
    {
      title: 'Daily Phrase Pack',
      description: "Tell me your plans and get the exact phrases you'll need today.",
      icon: <TodayIcon />,
      gradient: `linear-gradient(135deg, ${brand[500]}, ${brand[700]})`,
      href: '/travel/daily',
      badge: 'AI',
    },
    {
      title: 'Scenario Practice',
      description: 'Practice real conversations — type in English, learn the Japanese.',
      icon: <RecordVoiceOverIcon />,
      gradient: `linear-gradient(135deg, #7c3aed, #5b21b6)`,
      href: '/travel/scenarios',
      badge: 'AI',
    },
    {
      title: 'Point & Communicate',
      description: "Cards to show when you can't speak — allergies, directions, requests.",
      icon: <PanToolIcon />,
      gradient: `linear-gradient(135deg, ${accent[500]}, ${accent[700]})`,
      href: '/travel/show-cards',
      badge: 'AI',
    },
    {
      title: '"What Did They Say?"',
      description: 'Phrases Japanese people say TO you — at stores, restaurants, stations.',
      icon: <VolumeUpIcon />,
      gradient: `linear-gradient(135deg, #0891b2, #0e7490)`,
      href: '/travel/heard',
    },
    {
      title: 'Food Menu Cheat Sheet',
      description: "Know what you're ordering — ramen, sushi, drinks, and konbini food.",
      icon: <RestaurantIcon />,
      gradient: `linear-gradient(135deg, #ea580c, #c2410c)`,
      href: '/travel/food',
    },
    {
      title: 'Katakana Decoder',
      description: 'Learn the 46 characters used for foreign words on menus and signs.',
      icon: <TranslateIcon />,
      gradient: `linear-gradient(135deg, #10b981, #059669)`,
      href: '/travel/katakana',
    },
    {
      title: 'Survival Phrases',
      description: 'Essential phrases by situation — with romaji pronunciation and tips.',
      icon: <MenuBookIcon />,
      gradient: `linear-gradient(135deg, #6366f1, #4f46e5)`,
      href: '/travel/phrases',
    },
    {
      title: 'Emergency Card',
      description: 'Hotel address, medical info, and emergency numbers — ready to show.',
      icon: <LocalHospitalIcon />,
      gradient: `linear-gradient(135deg, #dc2626, #b91c1c)`,
      href: '/travel/emergency',
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 4 }, px: { xs: 2, sm: 3 } }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 1 }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: '16px',
              background: `linear-gradient(135deg, ${brand[500]}, ${brand[700]})`,
              mb: 2,
              boxShadow: `0 4px 16px ${alpha(brand[500], 0.3)}`,
            }}
          >
            <FlightIcon sx={{ fontSize: 28, color: '#fff' }} />
          </Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              fontFamily: (t) => t.fonts.display,
              color: 'text.primary',
              mb: 0.5,
            }}
          >
            Travel Mode
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 360, mx: 'auto' }}>
            Zero Japanese required. Everything you need to navigate Japan with confidence.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1.5 }}>
            <TravelDisplayToggle />
          </Box>
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

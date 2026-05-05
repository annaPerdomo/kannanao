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
import { alpha, Box, Card, Container, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';

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
    <Card
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
        borderRadius: 4,
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        border: `1px solid ${alpha(brand[300], 0.3)}`,
        background: alpha(brand[50], 0.6),
        backdropFilter: 'blur(8px)',
        '&:hover': {
          transform: 'translateY(-4px) scale(1.02)',
          boxShadow: `0 12px 40px ${alpha(brand[400], 0.2)}`,
          borderColor: alpha(brand[400], 0.5),
        },
        '&:active': {
          transform: 'translateY(-2px) scale(1.01)',
        },
      }}
    >
      {badge && (
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            px: 1.5,
            py: 0.25,
            borderRadius: 3,
            fontSize: '0.65rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            background: `linear-gradient(135deg, ${brand[500]}, ${brand[700]})`,
            color: '#fff',
          }}
        >
          {badge}
        </Box>
      )}
      <Box sx={{ p: 3 }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: gradient,
            mb: 2,
            '& .MuiSvgIcon-root': {
              fontSize: 28,
              color: '#fff',
            },
          }}
        >
          {icon}
        </Box>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            fontSize: '1.1rem',
            color: 'text.primary',
            mb: 0.5,
          }}
        >
          {title}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            lineHeight: 1.5,
          }}
        >
          {description}
        </Typography>
      </Box>
    </Card>
  );
}

export function TravelHub() {
  const theme = useTheme();
  const { brand, accent } = theme.palette;

  const features: FeatureCardProps[] = [
    {
      title: 'Culture Guide',
      description:
        "Know before you go — etiquette essentials, do's & don'ts, and tips that will make your trip smoother.",
      icon: (
        <Typography sx={{ fontSize: 24, lineHeight: 1, filter: 'brightness(0) invert(1)' }}>
          ⛩️
        </Typography>
      ),
      gradient: `linear-gradient(135deg, #dc2626, #991b1b)`,
      href: '/travel/culture',
    },
    {
      title: 'Daily Phrase Pack',
      description:
        "Tell me your plans for today and get the exact phrases you'll need — customized to YOUR day.",
      icon: <TodayIcon />,
      gradient: `linear-gradient(135deg, ${brand[500]}, ${brand[700]})`,
      href: '/travel/daily',
      badge: 'AI',
    },
    {
      title: 'Scenario Practice',
      description:
        'Practice real conversations — type what you want to say in English and learn the right Japanese phrase.',
      icon: <RecordVoiceOverIcon />,
      gradient: `linear-gradient(135deg, #7c3aed, #5b21b6)`,
      href: '/travel/scenarios',
      badge: 'AI',
    },
    {
      title: 'Point & Communicate Cards',
      description:
        "Cards you hold up to show Japanese people when you can't speak — allergies, directions, requests.",
      icon: <PanToolIcon />,
      gradient: `linear-gradient(135deg, ${accent[500]}, ${accent[700]})`,
      href: '/travel/show-cards',
      badge: 'AI',
    },
    {
      title: '"What Did They Say?"',
      description:
        'Phrases Japanese people say TO you — at the konbini, restaurants, stations. Know what to expect.',
      icon: <VolumeUpIcon />,
      gradient: `linear-gradient(135deg, #0891b2, #0e7490)`,
      href: '/travel/heard',
    },
    {
      title: 'Food Menu Cheat Sheet',
      description:
        "Know what you're ordering — ramen types, sushi, common dishes, drinks, and konbini food explained.",
      icon: <RestaurantIcon />,
      gradient: `linear-gradient(135deg, #ea580c, #c2410c)`,
      href: '/travel/food',
    },
    {
      title: 'Katakana Decoder',
      description:
        'Learn to read the 46 characters used for foreign words — menus, signs, and station names.',
      icon: <TranslateIcon />,
      gradient: `linear-gradient(135deg, #10b981, #059669)`,
      href: '/travel/katakana',
    },
    {
      title: 'Survival Phrases',
      description:
        'Essential phrases by situation — with romaji pronunciation, audio, and cultural tips.',
      icon: <MenuBookIcon />,
      gradient: `linear-gradient(135deg, #6366f1, #4f46e5)`,
      href: '/travel/phrases',
      badge: 'AI',
    },
    {
      title: 'Emergency Card',
      description:
        'Your hotel address, medical info, and emergency numbers — all in one place, ready to show.',
      icon: <LocalHospitalIcon />,
      gradient: `linear-gradient(135deg, #dc2626, #b91c1c)`,
      href: '/travel/emergency',
    },
  ];

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={4}>
        {/* Header */}
        <Box sx={{ textAlign: 'center' }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1.5,
              mb: 1,
            }}
          >
            <FlightIcon sx={{ fontSize: 32, color: brand[600] }} />
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                fontFamily: (t) => t.fonts.display,
                background: `linear-gradient(135deg, ${brand[600]}, ${brand[800]})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Travel Mode
            </Typography>
          </Box>
          <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 500, mx: 'auto' }}>
            Zero Japanese required. Everything you need to navigate Japan with confidence — powered
            by AI.
          </Typography>
        </Box>

        {/* Feature Cards Grid */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            gap: 2.5,
          }}
        >
          {features.map((feature) => (
            <FeatureCard key={feature.href} {...feature} />
          ))}
        </Box>

        {/* Bottom tip */}
        <Box
          sx={{
            textAlign: 'center',
            p: 2.5,
            borderRadius: 3,
            background: alpha(brand[100], 0.5),
            border: `1px solid ${alpha(brand[300], 0.2)}`,
          }}
        >
          <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
            Tip: All phrases include romaji (English-letter pronunciation) so you can read
            everything without knowing any Japanese characters.
          </Typography>
        </Box>
      </Stack>
    </Container>
  );
}

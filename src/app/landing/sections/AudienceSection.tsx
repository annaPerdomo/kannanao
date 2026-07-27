'use client';

import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import SportsEsportsRoundedIcon from '@mui/icons-material/SportsEsportsRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { useInView } from '@/hooks/useInView';
import { pink, purple } from '@/theme';

import { Blob } from './Blob';

const scrollTo = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

interface AudienceCardProps {
  audienceKey: 'educators' | 'learners';
  icon: React.ReactNode;
  accent: typeof pink;
  targetId: string;
  mascotSrc: string;
  mascotWidth: number;
  mascotHeight: number;
  inView: boolean;
  delay: number;
}

function AudienceCard({
  audienceKey,
  icon,
  accent,
  targetId,
  mascotSrc,
  mascotWidth,
  mascotHeight,
  inView,
  delay,
}: AudienceCardProps) {
  const t = useTranslations('Landing.audience');
  const points = t.raw(`${audienceKey}.points`) as string[];

  return (
    <Paper
      elevation={0}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        p: { xs: 3.5, md: 5 },
        pb: { xs: 16, sm: 5 },
        borderRadius: 7,
        background: `linear-gradient(160deg, ${alpha(accent[50], 0.9)} 0%, ${alpha(accent[100], 0.55)} 100%)`,
        border: `1.5px solid ${alpha(accent[300], 0.45)}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 2.5,
        opacity: inView ? 1 : 0,
        transform: inView ? 'translateY(0)' : 'translateY(36px)',
        transition: `opacity 0.8s ease ${delay}s, transform 0.8s ease ${delay}s`,
        '&:hover': { boxShadow: `0 18px 56px ${alpha(accent[400], 0.25)}` },
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box
          sx={{
            width: 46,
            height: 46,
            borderRadius: 3.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            background: `linear-gradient(135deg, ${accent[400]} 0%, ${accent[600]} 100%)`,
            boxShadow: `0 6px 18px ${alpha(accent[500], 0.35)}`,
          }}
        >
          {icon}
        </Box>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: '0.78rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: accent[600],
          }}
        >
          {t(`${audienceKey}.label`)}
        </Typography>
      </Stack>

      <Typography
        component="h3"
        sx={{
          fontFamily: (theme) => theme.fonts.display,
          fontSize: { xs: '1.7rem', sm: '1.9rem', md: '2.2rem' },
          color: accent[700],
          lineHeight: 1.15,
          maxWidth: 380,
        }}
      >
        {t(`${audienceKey}.title`)}
      </Typography>

      <Stack spacing={1.5} sx={{ maxWidth: { sm: '72%', md: '78%' } }}>
        {points.map((point) => (
          <Stack key={point} direction="row" spacing={1.25} alignItems="flex-start">
            <CheckCircleRoundedIcon
              sx={{ fontSize: '1.15rem', color: accent[500], mt: 0.35, flexShrink: 0 }}
            />
            <Typography sx={{ fontSize: '0.92rem', color: 'text.primary', lineHeight: 1.65 }}>
              {point}
            </Typography>
          </Stack>
        ))}
      </Stack>

      <Box sx={{ mt: 'auto', pt: 1 }}>
        <Button
          variant="contained"
          onClick={() => scrollTo(targetId)}
          sx={{
            fontFamily: (theme) => theme.fonts.display,
            fontSize: '0.95rem',
            textTransform: 'none',
            borderRadius: 8,
            px: 3.5,
            py: 1.25,
            background: `linear-gradient(135deg, ${accent[400]} 0%, ${accent[600]} 100%)`,
            boxShadow: `0 8px 24px ${alpha(accent[500], 0.38)}`,
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: `0 12px 32px ${alpha(accent[500], 0.48)}`,
            },
          }}
        >
          {t(`${audienceKey}.cta`)} ↓
        </Button>
      </Box>

      <Box
        sx={{
          position: 'absolute',
          right: { xs: 8, md: 16 },
          bottom: -6,
          width: { xs: 120, md: 150 },
          pointerEvents: 'none',
        }}
      >
        <Image
          src={mascotSrc}
          width={mascotWidth}
          height={mascotHeight}
          alt=""
          style={{ width: '100%', height: 'auto' }}
        />
      </Box>
    </Paper>
  );
}

export function AudienceSection() {
  const t = useTranslations('Landing.audience');
  const { ref, inView } = useInView(0.12);

  return (
    <Box
      ref={ref}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(178deg, ${pink[50]} 0%, #FFFFFF 32%, ${alpha(purple[50], 0.85)} 100%)`,
        py: { xs: 7, md: 12 },
        px: { xs: 2, sm: 4, md: 6, lg: 8 },
      }}
    >
      <Blob color={purple[200]} size={420} top="-80px" right="-90px" opacity={0.3} blur={85} />
      <Blob color={pink[200]} size={360} bottom="-70px" left="-70px" opacity={0.3} blur={80} />

      <Box sx={{ maxWidth: 1220, mx: 'auto', width: '100%', position: 'relative', zIndex: 1 }}>
        <Box
          sx={{
            textAlign: 'center',
            mb: { xs: 3.5, md: 7 },
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(28px)',
            transition: 'opacity 0.8s ease, transform 0.8s ease',
          }}
        >
          <Chip
            icon={
              <AutoAwesomeIcon
                sx={{ fontSize: '0.85rem !important', color: `${purple[600]} !important` }}
              />
            }
            label={t('badge')}
            size="small"
            sx={{
              mb: 2.5,
              bgcolor: alpha(purple[100], 0.55),
              color: purple[700],
              fontWeight: 700,
              fontSize: '0.72rem',
              border: `1px solid ${alpha(purple[300], 0.5)}`,
              borderRadius: 6,
            }}
          />
          <Typography
            component="h2"
            sx={{
              fontFamily: (theme) => theme.fonts.display,
              fontSize: { xs: '2rem', sm: '2.9rem', md: '3.5rem' },
              lineHeight: 1.05,
              mb: 1.5,
              background: `linear-gradient(135deg, ${purple[600]} 0%, ${pink[600]} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {t.rich('heading', { br: () => <br /> })}
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: '0.92rem', sm: '1rem' },
              color: 'text.secondary',
              maxWidth: 520,
              mx: 'auto',
              lineHeight: { xs: 1.6, sm: 1.7 },
            }}
          >
            {t('subheading')}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: { xs: 3, md: 3.5 },
            alignItems: 'stretch',
          }}
        >
          <AudienceCard
            audienceKey="educators"
            icon={<SchoolRoundedIcon />}
            accent={purple}
            targetId="for-educators"
            mascotSrc="/mascot/tea.png"
            mascotWidth={268}
            mascotHeight={326}
            inView={inView}
            delay={0.15}
          />
          <AudienceCard
            audienceKey="learners"
            icon={<SportsEsportsRoundedIcon />}
            accent={pink}
            targetId="for-learners"
            mascotSrc="/mascot/cheer.png"
            mascotWidth={404}
            mascotHeight={399}
            inView={inView}
            delay={0.3}
          />
        </Box>
      </Box>
    </Box>
  );
}

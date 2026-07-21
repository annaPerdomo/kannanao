'use client';

import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutlineRounded';
import JoinFullIcon from '@mui/icons-material/JoinFullRounded';
import PsychologyIcon from '@mui/icons-material/PsychologyRounded';
import ReplayIcon from '@mui/icons-material/ReplayRounded';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { useInView } from '@/hooks/useInView';
import { emerald, pink, purple, sky } from '@/theme';

import { Blob } from './Blob';
import { SrsDemo } from './SrsDemo';

const MODES = [
  {
    key: 'dailyReview',
    Icon: ReplayIcon,
    color: sky[600],
    bg: alpha(sky[100], 0.6),
    border: alpha(sky[300], 0.55),
  },
  {
    key: 'match',
    Icon: JoinFullIcon,
    color: emerald[500],
    bg: alpha(emerald[100], 0.55),
    border: alpha(emerald[300], 0.55),
  },
  {
    key: 'fillInTheBlank',
    Icon: DriveFileRenameOutlineIcon,
    color: purple[600],
    bg: alpha(purple[100], 0.6),
    border: alpha(purple[300], 0.55),
  },
  {
    key: 'recall',
    Icon: PsychologyIcon,
    color: pink[600],
    bg: alpha(pink[100], 0.6),
    border: alpha(pink[300], 0.55),
  },
];

export function PracticeSection() {
  const t = useTranslations('Landing.practice');
  const { ref, inView } = useInView(0.1);

  return (
    <Box
      ref={ref}
      id="for-learners"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        scrollMarginTop: 72,
        background: `linear-gradient(148deg, ${pink[50]} 0%, ${alpha(pink[100], 0.6)} 35%, ${alpha(purple[50], 0.75)} 70%, ${pink[50]} 100%)`,
        display: 'flex',
        alignItems: 'center',
        py: { xs: 10, md: 10 },
        px: { xs: 2, sm: 4, md: 6, lg: 8 },
      }}
    >
      <Blob color={pink[300]} size={440} top="-60px" left="-60px" opacity={0.28} blur={80} />
      <Blob color={purple[300]} size={380} bottom="-60px" right="-60px" opacity={0.22} blur={75} />

      <Box sx={{ maxWidth: 1220, mx: 'auto', width: '100%', position: 'relative', zIndex: 1 }}>
        <Box
          sx={{
            textAlign: 'center',
            mb: { xs: 5, md: 7 },
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
              bgcolor: alpha(pink[100], 0.7),
              color: pink[700],
              fontWeight: 800,
              fontSize: '0.68rem',
              letterSpacing: '0.14em',
              border: `1px solid ${alpha(pink[300], 0.55)}`,
              borderRadius: 6,
            }}
          />
          <Typography
            component="h2"
            sx={{
              fontFamily: (t) => t.fonts.display,
              fontSize: { xs: '2.2rem', sm: '2.8rem', md: '3.4rem' },
              color: pink[700],
              mb: 1.5,
              lineHeight: 1.05,
            }}
          >
            {t('heading')}
          </Typography>
          <Typography
            sx={{
              fontSize: '1rem',
              color: alpha(pink[700], 0.6),
              maxWidth: 520,
              mx: 'auto',
              lineHeight: 1.7,
            }}
          >
            {t('subheading')}
          </Typography>
        </Box>

        <SrsDemo />

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 2.5,
          }}
        >
          {MODES.map((m, i) => (
            <Paper
              key={m.key}
              elevation={0}
              sx={{
                p: 3.5,
                borderRadius: 5,
                background: m.bg,
                border: `1.5px solid ${m.border}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(32px)',
                transition: `opacity 0.65s ease ${0.12 * i}s, transform 0.65s ease ${0.12 * i}s`,
                '&:hover': {
                  transform: 'translateY(-6px) !important',
                  boxShadow: `0 14px 44px ${alpha(m.color, 0.22)}`,
                  transition: 'all 0.25s ease !important',
                },
              }}
            >
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: 3.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: alpha(m.color, 0.12),
                  border: `1px solid ${alpha(m.color, 0.22)}`,
                }}
              >
                <m.Icon sx={{ fontSize: '1.8rem', color: m.color }} />
              </Box>
              <Typography
                sx={{ fontFamily: (t) => t.fonts.display, fontSize: '1.3rem', color: m.color }}
              >
                {t(`modes.${m.key}.name`)}
              </Typography>
              <Typography sx={{ fontSize: '0.87rem', color: 'text.secondary', lineHeight: 1.72 }}>
                {t(`modes.${m.key}.desc`)}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

'use client';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { useInView } from '@/hooks/useInView';
import { emerald, pink, purple, sky } from '@/theme';

// Review milestones: horizontal position mimics the growing gap between
// reviews, strength is the memory bar height after that review.
const STEPS = [
  { key: 'today', left: '4%', strength: 0.38, color: pink[500] },
  { key: 'threeDays', left: '24%', strength: 0.58, color: purple[500] },
  { key: 'oneWeek', left: '50%', strength: 0.78, color: sky[500] },
  { key: 'oneMonth', left: '86%', strength: 1, color: emerald[500] },
] as const;

const BAR_AREA_HEIGHT = 96;
const STEP_DELAY = 0.55;

export function SrsDemo() {
  const t = useTranslations('Landing.practice.srs');
  const { ref, inView } = useInView(0.35);

  return (
    <Paper
      ref={ref}
      elevation={0}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 6,
        border: `1.5px solid ${alpha(purple[300], 0.45)}`,
        background: `linear-gradient(135deg, ${alpha('#fff', 0.85)} 0%, ${alpha(purple[50], 0.9)} 100%)`,
        p: { xs: 3, md: 4.5 },
        mb: { xs: 5, md: 7 },
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '0.9fr 1.1fr' },
        gap: { xs: 3.5, md: 5 },
        alignItems: 'center',
      }}
    >
      <Box>
        <Typography
          component="h3"
          sx={{
            fontFamily: (theme) => theme.fonts.display,
            fontSize: { xs: '1.5rem', md: '1.8rem' },
            color: purple[700],
            mb: 1.25,
            lineHeight: 1.2,
          }}
        >
          {t('title')}
        </Typography>
        <Typography
          sx={{ fontSize: '0.95rem', color: 'text.secondary', lineHeight: 1.75, mb: 2.5 }}
        >
          {t('subtitle')}
        </Typography>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Paper
            elevation={0}
            sx={{
              px: 2,
              py: 1,
              borderRadius: 3.5,
              border: `1.5px solid ${alpha(pink[300], 0.55)}`,
              bgcolor: alpha(pink[50], 0.9),
              display: 'inline-flex',
              alignItems: 'baseline',
              gap: 1,
            }}
          >
            <Typography
              sx={{ fontFamily: (theme) => theme.fonts.jp, fontSize: '1.5rem', color: pink[700] }}
            >
              桜
            </Typography>
            <Typography sx={{ fontSize: '0.85rem', color: pink[600] }}>さくら</Typography>
            <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
              · cherry blossom
            </Typography>
          </Paper>
          <Typography
            sx={{
              fontSize: '0.7rem',
              fontWeight: 800,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: alpha(purple[600], 0.7),
            }}
          >
            {t('wordLabel')}
          </Typography>
        </Stack>
      </Box>

      <Box sx={{ position: 'relative', pt: 3.5, pb: 1 }}>
        <Typography
          sx={{
            fontSize: '0.68rem',
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: alpha(purple[600], 0.65),
            mb: 1,
          }}
        >
          {t('memoryLabel')}
        </Typography>

        <Box sx={{ position: 'relative', height: BAR_AREA_HEIGHT + 58 }}>
          {/* baseline the reviews sit on */}
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              top: BAR_AREA_HEIGHT,
              height: 3,
              borderRadius: 2,
              background: `linear-gradient(90deg, ${pink[400]}, ${purple[400]}, ${sky[400]}, ${emerald[400]})`,
              width: inView ? '100%' : '0%',
              transition: `width ${STEP_DELAY * STEPS.length}s ease-out`,
            }}
          />
          {STEPS.map((step, i) => (
            <Box
              key={step.key}
              sx={{
                position: 'absolute',
                left: step.left,
                top: 0,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                opacity: inView ? 1 : 0,
                transform: inView ? 'scale(1)' : 'scale(0.6)',
                transition: `opacity 0.4s ease ${STEP_DELAY * (i + 0.5)}s, transform 0.4s cubic-bezier(0.34,1.56,0.64,1) ${STEP_DELAY * (i + 0.5)}s`,
              }}
            >
              <Box
                sx={{
                  height: BAR_AREA_HEIGHT,
                  display: 'flex',
                  alignItems: 'flex-end',
                  mb: '-6px',
                }}
              >
                <Box
                  sx={{
                    width: 22,
                    borderRadius: '6px 6px 0 0',
                    background: `linear-gradient(180deg, ${alpha(step.color, 0.9)} 0%, ${alpha(step.color, 0.45)} 100%)`,
                    height: inView ? BAR_AREA_HEIGHT * step.strength * 0.92 : 4,
                    transition: `height 0.6s ease ${STEP_DELAY * (i + 0.7)}s`,
                  }}
                />
              </Box>
              <Box
                sx={{
                  width: 15,
                  height: 15,
                  borderRadius: '50%',
                  bgcolor: step.color,
                  border: '2.5px solid white',
                  boxShadow: `0 0 0 3px ${alpha(step.color, 0.25)}`,
                  zIndex: 1,
                }}
              />
              <Typography
                sx={{
                  mt: 0.75,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: step.color,
                  whiteSpace: 'nowrap',
                }}
              >
                {t(`steps.${step.key}`)}
              </Typography>
            </Box>
          ))}

          <Chip
            label={t('learnedChip')}
            size="small"
            sx={{
              position: 'absolute',
              right: 0,
              top: -8,
              bgcolor: alpha(emerald[100], 0.9),
              color: emerald[700],
              fontWeight: 800,
              fontSize: '0.7rem',
              border: `1px solid ${alpha(emerald[400], 0.5)}`,
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateY(0)' : 'translateY(8px)',
              transition: `opacity 0.5s ease ${STEP_DELAY * (STEPS.length + 0.6)}s, transform 0.5s ease ${STEP_DELAY * (STEPS.length + 0.6)}s`,
            }}
          />
        </Box>
      </Box>

      <Box
        sx={{
          position: 'absolute',
          right: { xs: -14, md: 10 },
          bottom: -4,
          width: { xs: 64, md: 80 },
          pointerEvents: 'none',
          opacity: inView ? 1 : 0,
          transition: `opacity 0.6s ease ${STEP_DELAY * (STEPS.length + 1)}s`,
          display: { xs: 'none', sm: 'block' },
        }}
      >
        <Image
          src="/mascot/head-peek.png"
          width={313}
          height={265}
          alt=""
          style={{ width: '100%', height: 'auto' }}
        />
      </Box>
    </Paper>
  );
}

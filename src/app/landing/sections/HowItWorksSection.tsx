'use client';

import EditNoteIcon from '@mui/icons-material/EditNoteRounded';
import GroupsIcon from '@mui/icons-material/GroupsRounded';
import PaletteIcon from '@mui/icons-material/PaletteRounded';
import SportsEsportsIcon from '@mui/icons-material/SportsEsportsRounded';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { useInView } from '@/hooks/useInView';
import { purple, sky } from '@/theme';

import { Blob } from './Blob';

const STEPS = [
  {
    n: 1,
    Icon: EditNoteIcon,
    key: 'createYourDecks',
  },
  {
    n: 2,
    Icon: SportsEsportsIcon,
    key: 'studyYourWay',
  },
  {
    n: 3,
    Icon: PaletteIcon,
    key: 'earnAndCustomise',
  },
  {
    n: 4,
    Icon: GroupsIcon,
    key: 'learnTogether',
  },
];

export function HowItWorksSection() {
  const t = useTranslations('Landing.howItWorks');
  const { ref, inView } = useInView(0.1);

  return (
    <Box
      ref={ref}
      sx={{
        minHeight: '100svh',
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(148deg, ${sky[50]} 0%, ${sky[100]} 35%, ${alpha(sky[100], 0.5)} 65%, ${sky[50]} 100%)`,
        display: 'flex',
        alignItems: 'center',
        py: { xs: 7, md: 8 },
        px: { xs: 2, sm: 4, md: 6, lg: 8 },
      }}
    >
      <Blob color={sky[300]} size={520} top="-120px" right="-90px" opacity={0.28} blur={90} pulse />
      <Blob color={purple[300]} size={360} bottom="-30px" left="-70px" opacity={0.2} blur={80} />
      <Blob color={sky[200]} size={280} top="45%" left="45%" opacity={0.25} blur={60} />

      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage: `linear-gradient(${alpha(sky[300], 0.15)} 1px, transparent 1px), linear-gradient(90deg, ${alpha(sky[300], 0.15)} 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }}
      />

      <Box
        sx={{
          maxWidth: 1220,
          mx: 'auto',
          width: '100%',
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          gap: { xs: 4.5, lg: 14 },
          alignItems: 'center',
        }}
      >
        <Box
          sx={{
            flex: '0 0 auto',
            maxWidth: { lg: 360 },
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateX(0)' : 'translateX(-40px)',
            transition: 'opacity 0.8s ease, transform 0.8s ease',
          }}
        >
          <Typography
            component="h2"
            sx={{
              fontFamily: (t) => t.fonts.display,
              fontSize: { xs: '2.1rem', sm: '3rem', lg: '3.6rem' },
              color: sky[700],
              lineHeight: 1.05,
              mb: 2,
            }}
          >
            {t.rich('heading', { br: () => <br /> })}
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: '0.92rem', sm: '1rem' },
              color: alpha(sky[700], 0.62),
              lineHeight: { xs: 1.65, sm: 1.8 },
              mb: { xs: 3, sm: 4 },
            }}
          >
            {t('subheading')}
          </Typography>
          <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
            {[
              ['9', t('stats.travelModules')],
              ['12+', t('stats.achievements')],
              ['10', t('stats.themes')],
            ].map(([n, label]) => (
              <Box key={label}>
                <Typography
                  sx={{
                    fontFamily: (t) => t.fonts.display,
                    fontSize: '2.6rem',
                    color: sky[600],
                    lineHeight: 1,
                  }}
                >
                  {n}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.72rem',
                    color: alpha(sky[700], 0.52),
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  {label}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>

        <Box sx={{ flex: 1 }}>
          {STEPS.map((s, i) => (
            <Box
              key={s.n}
              sx={{
                display: 'flex',
                gap: { xs: 2, sm: 3 },
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateX(0)' : 'translateX(40px)',
                transition: `opacity 0.65s ease ${0.15 * i}s, transform 0.65s ease ${0.15 * i}s`,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flexShrink: 0,
                }}
              >
                <Box
                  sx={{
                    width: 54,
                    height: 54,
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${sky[400]} 0%, ${sky[600]} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 6px 24px ${alpha(sky[500], 0.42)}`,
                    flexShrink: 0,
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: (t) => t.fonts.display,
                      fontSize: '1.4rem',
                      color: '#fff',
                      lineHeight: 1,
                    }}
                  >
                    {s.n}
                  </Typography>
                </Box>
                {i < STEPS.length - 1 && (
                  <Box
                    sx={{
                      width: 2,
                      flex: 1,
                      minHeight: 40,
                      mt: 0.5,
                      background: `linear-gradient(180deg, ${sky[400]}, ${alpha(sky[300], 0.25)})`,
                      borderRadius: 2,
                    }}
                  />
                )}
              </Box>
              <Box sx={{ pb: i < STEPS.length - 1 ? { xs: 3.5, sm: 5 } : 0, pt: 0.5 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                  <s.Icon sx={{ fontSize: '1.5rem', color: sky[500] }} />
                  <Typography
                    sx={{
                      fontFamily: (t) => t.fonts.display,
                      fontSize: '1.25rem',
                      color: sky[700],
                    }}
                  >
                    {t(`steps.${s.key}.title`)}
                  </Typography>
                </Stack>
                <Typography
                  sx={{ fontSize: '0.9rem', color: alpha(sky[700], 0.62), lineHeight: 1.75 }}
                >
                  {t(`steps.${s.key}.desc`)}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

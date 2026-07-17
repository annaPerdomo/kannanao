'use client';

import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PanToolIcon from '@mui/icons-material/PanTool';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import TodayIcon from '@mui/icons-material/Today';
import TranslateIcon from '@mui/icons-material/Translate';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { useInView } from '@/hooks/useInView';
import { emerald, lavender, purple, sky, teal } from '@/theme';

import { Blob } from './Blob';

const FREE_MODULES = [
  {
    key: 'survivalPhrases',
    icon: <MenuBookIcon />,
    href: '/travel/phrases',
    gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)',
    shadow: '#6366f1',
    sample: '「すみません」 sumimasen',
  },
  {
    key: 'foodMenu',
    icon: <RestaurantIcon />,
    href: '/travel/food',
    gradient: 'linear-gradient(135deg, #ea580c, #c2410c)',
    shadow: '#ea580c',
    sample: '「豚骨ラーメン」 tonkotsu',
  },
  {
    key: 'whatDidTheySay',
    icon: <VolumeUpIcon />,
    href: '/travel/heard',
    gradient: 'linear-gradient(135deg, #0891b2, #0e7490)',
    shadow: '#0891b2',
    sample: '「袋いりますか？」 Need a bag?',
  },
  {
    key: 'katakanaDecoder',
    icon: <TranslateIcon />,
    href: '/travel/katakana',
    gradient: 'linear-gradient(135deg, #10b981, #059669)',
    shadow: '#10b981',
    sample: 'コーヒー = koohii = coffee',
  },
  {
    key: 'cultureGuide',
    icon: (
      <Typography
        component="span"
        sx={{ fontSize: 20, lineHeight: 1, filter: 'brightness(0) invert(1)' }}
      >
        ⛩️
      </Typography>
    ),
    href: '/travel/culture',
    gradient: 'linear-gradient(135deg, #dc2626, #991b1b)',
    shadow: '#dc2626',
    sample: 'Shoes off before tatami!',
  },
];

const AI_MODULES = [
  {
    key: 'dailyPhrasePack',
    icon: <TodayIcon />,
    gradient: `linear-gradient(135deg, ${teal[400]}, ${teal[700]})`,
    shadow: teal[400],
  },
  {
    key: 'scenarioPractice',
    icon: <RecordVoiceOverIcon />,
    gradient: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
    shadow: '#7c3aed',
  },
  {
    key: 'pointCommunicate',
    icon: <PanToolIcon />,
    gradient: `linear-gradient(135deg, ${lavender[400]}, ${lavender[700]})`,
    shadow: lavender[400],
  },
];

const DEMO_STEP_COUNT = 5;

export function TravelModeSection() {
  const t = useTranslations('Landing.travelMode');
  const { ref, inView } = useInView(0.06);
  const [scenarioStep, setScenarioStep] = useState(0);

  useEffect(() => {
    if (!inView) return;
    setScenarioStep(0);
    let step = 0;
    const timer = setInterval(() => {
      step++;
      if (step >= DEMO_STEP_COUNT) {
        step = 0;
      }
      setScenarioStep(step);
    }, 2400);
    return () => clearInterval(timer);
  }, [inView]);

  return (
    <Box
      ref={ref}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(160deg, ${emerald[50]} 0%, ${teal[50]} 30%, ${alpha(emerald[50], 0.6)} 60%, ${sky[50]} 100%)`,
        py: { xs: 10, md: 12 },
        px: { xs: 2, sm: 4, md: 6, lg: 8 },
      }}
    >
      <Blob color={emerald[300]} size={520} top="-100px" right="-80px" opacity={0.22} blur={90} />
      <Blob
        color={teal[300]}
        size={380}
        bottom="-60px"
        left="-70px"
        opacity={0.2}
        blur={80}
        pulse
      />
      <Blob color={sky[300]} size={260} top="40%" left="25%" opacity={0.14} blur={60} />

      <Box sx={{ maxWidth: 1220, mx: 'auto', width: '100%', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <Box
          sx={{
            textAlign: 'center',
            mb: { xs: 5, md: 6 },
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
              bgcolor: alpha(emerald[500], 0.12),
              color: emerald[700],
              fontWeight: 800,
              fontSize: '0.65rem',
              letterSpacing: '0.12em',
              border: `1px solid ${alpha(emerald[400], 0.4)}`,
              borderRadius: 4,
            }}
          />
          <Typography
            component="h2"
            sx={{
              fontFamily: (t) => t.fonts.display,
              fontSize: { xs: '2.2rem', sm: '3rem', md: '3.8rem' },
              color: emerald[800],
              mb: 1.5,
              lineHeight: 1.05,
            }}
          >
            {t.rich('heading', { br: () => <br /> })}
          </Typography>
          <Typography
            sx={{
              fontSize: '1rem',
              color: alpha(emerald[800], 0.6),
              maxWidth: 560,
              mx: 'auto',
              lineHeight: 1.7,
              mb: 3,
            }}
          >
            {t('subheading')}
          </Typography>
          <Box
            component={Link}
            href="/travel"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              px: 3.5,
              py: 1.5,
              borderRadius: '12px',
              background: `linear-gradient(135deg, ${emerald[500]} 0%, ${teal[600]} 100%)`,
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.95rem',
              textDecoration: 'none',
              boxShadow: `0 4px 16px ${alpha(emerald[500], 0.35)}`,
              transition: 'all 0.25s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: `0 8px 24px ${alpha(emerald[500], 0.4)}`,
              },
            }}
          >
            {t('exploreCta')}
            <ArrowForwardIcon sx={{ fontSize: 18 }} />
          </Box>
        </Box>

        {/* ─── Free Phrasebooks ─────────────────────────── */}
        <Box
          sx={{
            mb: { xs: 6, md: 8 },
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.7s ease 0.15s, transform 0.7s ease 0.15s',
          }}
        >
          <Typography
            sx={{
              fontSize: '0.7rem',
              fontWeight: 800,
              letterSpacing: '0.14em',
              color: emerald[600],
              mb: 2.5,
              textAlign: 'center',
            }}
          >
            {t('freeSectionLabel')}
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(6, 1fr)' },
              gap: 2,
              '& > *': { gridColumn: { lg: 'span 2' } },
              '& > :nth-child(4)': { gridColumn: { lg: '2 / span 2' } },
            }}
          >
            {FREE_MODULES.map((f, i) => (
              <Paper
                key={f.key}
                component={Link}
                href={f.href}
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: '16px',
                  background: alpha('#fff', 0.7),
                  border: `1px solid ${alpha(emerald[300], 0.25)}`,
                  boxShadow: `0 1px 4px ${alpha(emerald[400], 0.08)}`,
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                  opacity: inView ? 1 : 0,
                  transform: inView ? 'translateY(0)' : 'translateY(16px)',
                  transition: `opacity 0.5s ease ${0.08 * i}s, transform 0.5s ease ${0.08 * i}s, box-shadow 0.25s ease, border-color 0.25s ease`,
                  '&:hover': {
                    boxShadow: `0 8px 28px ${alpha(f.shadow, 0.18)}`,
                    borderColor: alpha(f.shadow, 0.4),
                    '& .module-arrow': { transform: 'translateX(4px)', opacity: 1 },
                    '& .module-icon': { transform: 'scale(1.06)' },
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    className="module-icon"
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: '11px',
                      background: f.gradient,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 3px 10px ${alpha(f.shadow, 0.3)}`,
                      flexShrink: 0,
                      transition: 'transform 0.25s ease',
                      '& .MuiSvgIcon-root': { fontSize: 20, color: '#fff' },
                    }}
                  >
                    {f.icon}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography
                        sx={{
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          color: 'text.primary',
                          lineHeight: 1.2,
                        }}
                      >
                        {t(`freeModules.${f.key}.title`)}
                      </Typography>
                      <ArrowForwardIcon
                        className="module-arrow"
                        sx={{
                          fontSize: 14,
                          color: f.shadow,
                          opacity: 0,
                          transition: 'all 0.25s ease',
                        }}
                      />
                    </Box>
                    <Typography
                      sx={{
                        fontFamily: (t) => t.fonts.jp,
                        fontSize: '0.68rem',
                        color: alpha(f.shadow, 0.9),
                        fontWeight: 500,
                        mt: 0.25,
                      }}
                    >
                      {f.sample}
                    </Typography>
                  </Box>
                </Box>
                <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', lineHeight: 1.55 }}>
                  {t(`freeModules.${f.key}.desc`)}
                </Typography>
              </Paper>
            ))}
          </Box>
        </Box>

        {/* ─── AI-Powered Features ──────────────────────── */}
        <Box
          sx={{
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 0.7s ease 0.35s, transform 0.7s ease 0.35s',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              mb: 2.5,
            }}
          >
            <AutoAwesomeIcon sx={{ fontSize: 16, color: purple[500] }} />
            <Typography
              sx={{
                fontSize: '0.7rem',
                fontWeight: 800,
                letterSpacing: '0.14em',
                color: purple[600],
              }}
            >
              {t('aiSectionLabel')}
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', lg: 'row' },
              gap: { xs: 3, lg: 4 },
              alignItems: { lg: 'stretch' },
            }}
          >
            {/* AI module cards */}
            <Stack spacing={2} sx={{ flex: 1 }}>
              {AI_MODULES.map((f, i) => (
                <Paper
                  key={f.key}
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: '16px',
                    background: alpha('#fff', 0.5),
                    border: `1px solid ${alpha(purple[200], 0.3)}`,
                    boxShadow: `0 1px 3px ${alpha(purple[300], 0.06)}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    opacity: inView ? 1 : 0,
                    transform: inView ? 'translateX(0)' : 'translateX(-16px)',
                    transition: `opacity 0.5s ease ${0.4 + 0.08 * i}s, transform 0.5s ease ${0.4 + 0.08 * i}s`,
                  }}
                >
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: '11px',
                      background: f.gradient,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: `0 3px 10px ${alpha(f.shadow, 0.3)}`,
                      flexShrink: 0,
                      '& .MuiSvgIcon-root': { fontSize: 20, color: '#fff' },
                    }}
                  >
                    {f.icon}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Typography
                        sx={{ fontSize: '0.88rem', fontWeight: 700, color: 'text.primary' }}
                      >
                        {t(`aiModules.${f.key}.title`)}
                      </Typography>
                      <Chip
                        label={t('aiChipLabel')}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.55rem',
                          fontWeight: 800,
                          background: `linear-gradient(135deg, ${purple[500]}, ${purple[700]})`,
                          color: '#fff',
                          letterSpacing: '0.06em',
                        }}
                      />
                    </Box>
                    <Typography
                      sx={{
                        fontSize: '0.76rem',
                        color: 'text.secondary',
                        lineHeight: 1.5,
                        mt: 0.25,
                      }}
                    >
                      {t(`aiModules.${f.key}.desc`)}
                    </Typography>
                  </Box>
                </Paper>
              ))}
            </Stack>

            {/* Animated Scenario Preview — matches real ScenarioPlayer UI */}
            <Box
              sx={{
                flex: '0 0 auto',
                width: { xs: '100%', lg: 360 },
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateX(0)' : 'translateX(36px)',
                transition: 'opacity 0.8s ease 0.5s, transform 0.8s ease 0.5s',
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: `1.5px solid ${alpha(emerald[300], 0.4)}`,
                  boxShadow: `0 20px 60px ${alpha(emerald[400], 0.12)}, 0 4px 16px ${alpha(teal[400], 0.08)}`,
                  background: alpha(emerald[50], 0.3),
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Header — matches app scenario header */}
                <Box
                  sx={{
                    px: 2,
                    py: 1.5,
                    background: `linear-gradient(135deg, ${emerald[500]} 0%, ${teal[600]} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '9px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: alpha('#fff', 0.2),
                    }}
                  >
                    <Typography sx={{ fontSize: '1rem', lineHeight: 1 }}>🍜</Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 800, color: 'common.white' }}>
                      {t('demo.scenarioTitle')}
                    </Typography>
                    <Typography
                      sx={{ fontSize: '0.6rem', color: alpha('#fff', 0.7), fontWeight: 500 }}
                    >
                      {t('demo.scenarioSubtitle')}
                    </Typography>
                  </Box>
                  <Chip
                    label={t('demo.demoChip')}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.5rem',
                      fontWeight: 800,
                      bgcolor: alpha('#fff', 0.2),
                      color: '#fff',
                      letterSpacing: '0.08em',
                    }}
                  />
                </Box>

                {/* Coaching flow content */}
                <Box sx={{ p: 2, flex: 1 }}>
                  <Stack spacing={1.5}>
                    {/* Context line */}
                    <Box
                      sx={{
                        textAlign: 'center',
                        opacity: scenarioStep >= 0 ? 1 : 0,
                        transform: scenarioStep >= 0 ? 'translateY(0)' : 'translateY(6px)',
                        transition: 'all 0.5s ease',
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: '0.65rem',
                          fontStyle: 'italic',
                          color: alpha(emerald[800], 0.5),
                          lineHeight: 1.4,
                        }}
                      >
                        {t('demo.contextLine')}
                      </Typography>
                    </Box>

                    {/* NPC speech bubble */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 0.75,
                        opacity: scenarioStep >= 1 ? 1 : 0.12,
                        transform: scenarioStep >= 1 ? 'translateY(0)' : 'translateY(8px)',
                        transition: 'all 0.5s cubic-bezier(0.34,1.56,0.64,1)',
                      }}
                    >
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: alpha(emerald[100], 0.8),
                          border: `1px solid ${alpha(emerald[200], 0.5)}`,
                          flexShrink: 0,
                          mt: 0.5,
                        }}
                      >
                        <RecordVoiceOverIcon sx={{ color: emerald[600], fontSize: 12 }} />
                      </Box>
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: '14px',
                          borderTopLeftRadius: '4px',
                          bgcolor: alpha(emerald[50], 0.8),
                          border: `1px solid ${alpha(emerald[200], 0.4)}`,
                          flex: 1,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            color: 'text.primary',
                            fontFamily: (t) => t.fonts.jp,
                            lineHeight: 1.3,
                          }}
                        >
                          いらっしゃいませ！何名様ですか？
                        </Typography>
                        <Typography
                          sx={{ fontSize: '0.62rem', color: alpha(emerald[700], 0.6), mt: 0.25 }}
                        >
                          irasshaimase! nan-mei-sama desu ka?
                        </Typography>
                        <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', mt: 0.25 }}>
                          Welcome! How many people?
                        </Typography>
                      </Box>
                    </Box>

                    {/* Coached phrase card — "SAY THIS" */}
                    <Box
                      sx={{
                        ml: 'auto',
                        maxWidth: '88%',
                        opacity: scenarioStep >= 2 ? 1 : 0.12,
                        transform: scenarioStep >= 2 ? 'translateX(0)' : 'translateX(12px)',
                        transition: 'all 0.5s cubic-bezier(0.34,1.56,0.64,1)',
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: '0.58rem',
                          color: alpha(emerald[800], 0.35),
                          textAlign: 'right',
                          mb: 0.25,
                        }}
                      >
                        &ldquo;Just me, one person&rdquo;
                      </Typography>
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: '14px',
                          borderTopRightRadius: '4px',
                          background: `linear-gradient(135deg, ${alpha(purple[500], 0.06)}, ${alpha(purple[400], 0.03)})`,
                          border: `1px solid ${alpha(purple[400], 0.2)}`,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                          <AutoAwesomeIcon sx={{ color: purple[500], fontSize: 12 }} />
                          <Typography
                            sx={{
                              fontSize: '0.55rem',
                              fontWeight: 800,
                              color: purple[600],
                              letterSpacing: '0.06em',
                            }}
                          >
                            {t('demo.sayThis')}
                          </Typography>
                        </Box>
                        <Typography
                          sx={{
                            fontSize: '0.95rem',
                            fontWeight: 600,
                            color: 'text.primary',
                            fontFamily: (t) => t.fonts.jp,
                            lineHeight: 1.3,
                          }}
                        >
                          一人です
                        </Typography>
                        <Typography
                          sx={{ fontSize: '0.62rem', color: alpha(purple[600], 0.6), mt: 0.25 }}
                        >
                          hitori desu
                        </Typography>
                        <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', mt: 0.25 }}>
                          One person
                        </Typography>
                      </Box>
                    </Box>

                    {/* Cultural tip */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 0.75,
                        px: 1.5,
                        py: 1,
                        borderRadius: '8px',
                        background: alpha('#f59e0b', 0.06),
                        border: `1px solid ${alpha('#f59e0b', 0.12)}`,
                        opacity: scenarioStep >= 3 ? 1 : 0,
                        transform: scenarioStep >= 3 ? 'translateY(0)' : 'translateY(6px)',
                        transition: 'all 0.5s ease',
                      }}
                    >
                      <LightbulbIcon sx={{ color: '#f59e0b', fontSize: 12, mt: 0.25 }} />
                      <Typography
                        sx={{ fontSize: '0.62rem', color: 'text.secondary', lineHeight: 1.45 }}
                      >
                        {t('demo.culturalTip')}
                      </Typography>
                    </Box>
                  </Stack>

                  {/* Suggestions + input — always visible */}
                  <Box
                    sx={{
                      mt: 2,
                      pt: 1.5,
                      borderTop: `1px solid ${alpha(emerald[200], 0.4)}`,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: '0.55rem',
                        color: alpha(emerald[800], 0.35),
                        mb: 0.5,
                      }}
                    >
                      {t('demo.suggestionsLabel')}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                      {(t.raw('demo.suggestions') as string[]).map((choice) => (
                        <Box
                          key={choice}
                          sx={{
                            py: 0.5,
                            px: 1,
                            borderRadius: '14px',
                            border: `1px solid ${alpha(emerald[300], 0.4)}`,
                            bgcolor: alpha(emerald[50], 0.5),
                            cursor: 'default',
                          }}
                        >
                          <Typography
                            sx={{ fontSize: '0.58rem', fontWeight: 600, color: emerald[700] }}
                          >
                            {choice}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
                      <Box
                        sx={{
                          flex: 1,
                          py: 0.75,
                          px: 1.5,
                          borderRadius: '16px',
                          border: `1px solid ${alpha(emerald[300], 0.35)}`,
                          bgcolor: alpha('#fff', 0.6),
                        }}
                      >
                        <Typography sx={{ fontSize: '0.62rem', color: alpha(emerald[800], 0.3) }}>
                          {t('demo.inputPlaceholder')}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          bgcolor: emerald[500],
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <ArrowForwardIcon sx={{ color: '#fff', fontSize: 13 }} />
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Paper>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

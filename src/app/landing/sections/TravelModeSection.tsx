'use client';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';

import { emerald, lavender, ocean, purple, rose, sky, sunset, teal } from '@/theme';

import { Blob } from './Blob';
import { useInView } from './useInView';

// Mirrors the actual TravelHub feature cards with their gradient icon styling
const TRAVEL_FEATURES = [
  {
    icon: '🗣️',
    title: 'Daily Phrases',
    desc: 'Common expressions for everyday situations',
    gradient: `linear-gradient(135deg, ${teal[400]} 0%, ${emerald[600]} 100%)`,
    shadow: emerald[400],
  },
  {
    icon: '🎭',
    title: 'Scenarios',
    desc: 'Choose-your-own-adventure conversations',
    gradient: `linear-gradient(135deg, ${purple[400]} 0%, ${purple[700]} 100%)`,
    shadow: purple[400],
  },
  {
    icon: '🍜',
    title: 'Food Menu',
    desc: 'Order at restaurants with confidence',
    gradient: `linear-gradient(135deg, ${sunset[400]} 0%, ${sunset[600]} 100%)`,
    shadow: sunset[400],
  },
  {
    icon: '🆘',
    title: 'Emergency',
    desc: 'Critical phrases when you need them',
    gradient: `linear-gradient(135deg, ${rose[400]} 0%, ${rose[600]} 100%)`,
    shadow: rose[400],
  },
  {
    icon: '👂',
    title: 'What Did They Say?',
    desc: 'Practice listening comprehension',
    gradient: `linear-gradient(135deg, ${ocean[400]} 0%, ${ocean[600]} 100%)`,
    shadow: ocean[400],
  },
  {
    icon: '🔤',
    title: 'Katakana Decoder',
    desc: 'Read katakana loan words',
    gradient: `linear-gradient(135deg, ${emerald[400]} 0%, ${emerald[700]} 100%)`,
    shadow: emerald[400],
  },
  {
    icon: '⛩️',
    title: 'Culture Guide',
    desc: 'Japanese customs and etiquette',
    gradient: `linear-gradient(135deg, ${rose[500]} 0%, ${rose[700]} 100%)`,
    shadow: rose[500],
  },
  {
    icon: '🎯',
    title: 'Point & Communicate',
    desc: 'Show cards when words fail',
    gradient: `linear-gradient(135deg, ${lavender[400]} 0%, ${lavender[700]} 100%)`,
    shadow: lavender[400],
  },
  {
    icon: '🃏',
    title: 'Show Cards',
    desc: 'Pre-made phrase cards to display',
    gradient: `linear-gradient(135deg, ${sky[400]} 0%, ${ocean[600]} 100%)`,
    shadow: sky[400],
  },
];

const DEMO_SCENARIO = [
  { speaker: 'You', text: 'すみません、メニューをください', en: 'Excuse me, menu please' },
  { speaker: 'Staff', text: 'はい、どうぞ。お飲み物は？', en: 'Here you go. Drinks?' },
  { speaker: 'You', text: '水をお願いします', en: 'Water, please' },
  { speaker: 'Staff', text: 'かしこまりました', en: 'Certainly' },
];

export function TravelModeSection() {
  const { ref, inView } = useInView(0.06);
  const [scenarioStep, setScenarioStep] = useState(0);

  useEffect(() => {
    if (!inView) return;
    setScenarioStep(0);
    let step = 0;
    const timer = setInterval(() => {
      step++;
      if (step >= DEMO_SCENARIO.length) {
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
        <Box
          sx={{
            textAlign: 'center',
            mb: { xs: 6, md: 7 },
            opacity: inView ? 1 : 0,
            transform: inView ? 'translateY(0)' : 'translateY(32px)',
            transition: 'opacity 0.8s ease, transform 0.8s ease',
          }}
        >
          <Chip
            label="9 MODULES"
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
            Your pocket phrasebook
            <br />
            for Japan
          </Typography>
          <Typography
            sx={{
              fontSize: '1rem',
              color: alpha(emerald[800], 0.6),
              maxWidth: 560,
              mx: 'auto',
              lineHeight: 1.7,
            }}
          >
            From ordering ramen to navigating emergencies — interactive modules that prepare you for
            real conversations, not just textbook examples.
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', lg: 'row' },
            gap: { xs: 5, lg: 6 },
            alignItems: 'center',
          }}
        >
          {/* Feature Grid — mirrors TravelHub's card layout */}
          <Box
            sx={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
              gap: 1.5,
            }}
          >
            {TRAVEL_FEATURES.map((f, i) => (
              <Paper
                key={f.title}
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: '16px',
                  background: alpha(emerald[50], 0.4),
                  border: `1px solid ${alpha(emerald[300], 0.2)}`,
                  boxShadow: `0 1px 3px ${alpha(emerald[400], 0.08)}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  gap: 1,
                  opacity: inView ? 1 : 0,
                  transform: inView ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
                  transition: `opacity 0.5s ease ${0.06 * i}s, transform 0.5s cubic-bezier(0.34,1.56,0.64,1) ${0.06 * i}s`,
                  '&:hover': {
                    transform: 'translateY(-2px) !important',
                    boxShadow: `0 8px 24px ${alpha(f.shadow, 0.2)}`,
                    borderColor: alpha(f.shadow, 0.4),
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important',
                    '& .travel-icon': {
                      transform: 'scale(1.08)',
                    },
                  },
                }}
              >
                <Box
                  className="travel-icon"
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    background: f.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.4rem',
                    boxShadow: `0 4px 12px ${alpha(f.shadow, 0.3)}`,
                    transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  {f.icon}
                </Box>
                <Typography
                  sx={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: 'text.primary',
                    lineHeight: 1.2,
                  }}
                >
                  {f.title}
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.62rem',
                    color: 'text.secondary',
                    lineHeight: 1.4,
                  }}
                >
                  {f.desc}
                </Typography>
              </Paper>
            ))}
          </Box>

          {/* Animated Scenario Preview — like the actual ScenarioPlayer */}
          <Box
            sx={{
              flex: '0 0 auto',
              width: { xs: '100%', lg: 360 },
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateX(0)' : 'translateX(36px)',
              transition: 'opacity 0.8s ease 0.3s, transform 0.8s ease 0.3s',
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
              }}
            >
              {/* Header like actual scenario player */}
              <Box
                sx={{
                  px: 2.5,
                  py: 1.5,
                  background: `linear-gradient(135deg, ${emerald[500]} 0%, ${teal[600]} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Typography sx={{ fontSize: '1rem' }}>🎭</Typography>
                <Box>
                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 800, color: 'common.white' }}>
                    At a Restaurant
                  </Typography>
                  <Typography
                    sx={{ fontSize: '0.6rem', color: alpha(sky[50], 0.7), fontWeight: 500 }}
                  >
                    Scenario Practice
                  </Typography>
                </Box>
              </Box>

              {/* Conversation bubbles */}
              <Box sx={{ p: 2.5, minHeight: 320 }}>
                <Stack spacing={1.5}>
                  {DEMO_SCENARIO.map((line, i) => {
                    const isYou = line.speaker === 'You';
                    const isVisible = i <= scenarioStep;
                    return (
                      <Box
                        key={i}
                        sx={{
                          display: 'flex',
                          flexDirection: isYou ? 'row-reverse' : 'row',
                          gap: 1,
                          opacity: isVisible ? 1 : 0.15,
                          transform: isVisible ? 'translateY(0)' : 'translateY(8px)',
                          transition: 'all 0.5s cubic-bezier(0.34,1.56,0.64,1)',
                        }}
                      >
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: isYou
                              ? `linear-gradient(135deg, ${emerald[400]}, ${teal[500]})`
                              : `linear-gradient(135deg, ${sky[300]}, ${ocean[400]})`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.8rem',
                            flexShrink: 0,
                            boxShadow: `0 2px 8px ${alpha(isYou ? emerald[500] : sky[400], 0.3)}`,
                          }}
                        >
                          {isYou ? '🙋' : '👤'}
                        </Box>
                        <Box
                          sx={{
                            maxWidth: '75%',
                            p: 1.5,
                            borderRadius: '14px',
                            bgcolor: isYou ? alpha(emerald[100], 0.6) : alpha(sky[50], 0.8),
                            border: `1px solid ${alpha(isYou ? emerald[300] : sky[200], 0.5)}`,
                            animation:
                              i === scenarioStep ? 'gentleBounce 2s ease-in-out infinite' : 'none',
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: '0.88rem',
                              fontWeight: 600,
                              color: 'text.primary',
                              fontFamily: (t) => t.fonts.jp,
                              mb: 0.25,
                            }}
                          >
                            {line.text}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: '0.65rem',
                              color: 'text.secondary',
                              fontStyle: 'italic',
                            }}
                          >
                            {line.en}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>

                {/* Scenario choices hint */}
                <Box
                  sx={{
                    mt: 2.5,
                    pt: 2,
                    borderTop: `1px solid ${alpha(emerald[200], 0.4)}`,
                    display: 'flex',
                    gap: 1,
                  }}
                >
                  {['Ask for recommendation', 'Order food'].map((choice) => (
                    <Box
                      key={choice}
                      sx={{
                        flex: 1,
                        py: 1,
                        px: 1.5,
                        borderRadius: '10px',
                        border: `1.5px solid ${alpha(emerald[300], 0.5)}`,
                        bgcolor: alpha(emerald[50], 0.5),
                        textAlign: 'center',
                        cursor: 'default',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: alpha(emerald[100], 0.8),
                          borderColor: emerald[400],
                        },
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          color: emerald[700],
                        }}
                      >
                        {choice}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Paper>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

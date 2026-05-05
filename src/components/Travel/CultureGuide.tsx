'use client';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import {
  alpha,
  Box,
  Card,
  Chip,
  Container,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useSpeech } from '@/hooks/useSpeech';
import { useCultureCards } from '@/hooks/useTravel';
import type { CultureTopic } from '@/types/travel';

const TOPICS: Array<{ key: CultureTopic | 'all'; label: string; icon: string }> = [
  { key: 'all', label: 'All', icon: '📚' },
  { key: 'general', label: 'General', icon: '🇯🇵' },
  { key: 'restaurants', label: 'Food', icon: '🍱' },
  { key: 'trains', label: 'Trains', icon: '🚃' },
  { key: 'shopping', label: 'Shopping', icon: '🛍️' },
  { key: 'onsen', label: 'Onsen', icon: '♨️' },
  { key: 'shrines', label: 'Shrines', icon: '⛩️' },
  { key: 'taboos', label: 'Taboos', icon: '🚫' },
  { key: 'gestures', label: 'Gestures', icon: '🤲' },
];

const IMPORTANCE_CONFIG = {
  essential: {
    label: 'Must know',
    color: '#ef4444',
    icon: <PriorityHighIcon sx={{ fontSize: 14 }} />,
  },
  recommended: {
    label: 'Good to know',
    color: '#f59e0b',
    icon: <InfoOutlinedIcon sx={{ fontSize: 14 }} />,
  },
  nice_to_know: {
    label: 'Interesting',
    color: '#6366f1',
    icon: <ErrorOutlineIcon sx={{ fontSize: 14 }} />,
  },
};

export function CultureGuide() {
  const theme = useTheme();
  const { brand } = theme.palette;
  const router = useRouter();
  const { speak } = useSpeech();
  const { getCards } = useCultureCards();
  const [activeTopic, setActiveTopic] = useState<CultureTopic | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredCards = getCards(activeTopic);

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={() => router.push('/travel')} aria-label="Back to travel hub">
            <ArrowBackIcon />
          </IconButton>
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, fontFamily: (t) => t.fonts.display, color: 'text.primary' }}
          >
            Culture Guide
          </Typography>
        </Box>

        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Essential etiquette and cultural tips for navigating Japan. Each card includes useful
          phrases for that situation.
        </Typography>

        {/* Topic filter */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {TOPICS.map((topic) => (
            <Chip
              key={topic.key}
              label={`${topic.icon} ${topic.label}`}
              onClick={() => setActiveTopic(topic.key)}
              variant={activeTopic === topic.key ? 'filled' : 'outlined'}
              sx={{
                borderRadius: 2,
                fontWeight: activeTopic === topic.key ? 700 : 500,
                borderColor: alpha(brand[300], 0.4),
                ...(activeTopic === topic.key && {
                  bgcolor: alpha(brand[500], 0.12),
                  color: brand[700],
                  borderColor: brand[400],
                }),
              }}
            />
          ))}
        </Box>

        {/* Culture cards */}
        <Stack spacing={2}>
          {filteredCards.map((card) => {
            const isExpanded = expandedId === card.id;
            const importance = IMPORTANCE_CONFIG[card.importance];

            return (
              <Card
                key={card.id}
                onClick={() => setExpandedId(isExpanded ? null : card.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setExpandedId(isExpanded ? null : card.id);
                  }
                }}
                sx={{
                  borderRadius: 3,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: `1px solid ${alpha(brand[300], 0.3)}`,
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: alpha(brand[400], 0.5),
                    boxShadow: `0 4px 16px ${alpha(brand[400], 0.1)}`,
                  },
                }}
              >
                <Box sx={{ p: 2.5 }}>
                  {/* Title row */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Typography sx={{ fontSize: '1.5rem' }}>{card.icon}</Typography>
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant="subtitle1"
                        sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }}
                      >
                        {card.title}
                      </Typography>
                    </Box>
                    <Chip
                      icon={importance.icon}
                      label={importance.label}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        bgcolor: alpha(importance.color, 0.1),
                        color: importance.color,
                        '& .MuiChip-icon': { color: importance.color },
                      }}
                    />
                  </Box>

                  {/* Rule */}
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: 'text.primary',
                      px: 1.5,
                      py: 1,
                      borderRadius: 2,
                      background: alpha(brand[100], 0.5),
                      borderLeft: `3px solid ${alpha(importance.color, 0.6)}`,
                    }}
                  >
                    {card.rule}
                  </Typography>

                  {/* Expanded content */}
                  {isExpanded && (
                    <Box sx={{ mt: 2 }}>
                      <Typography
                        variant="body2"
                        sx={{ color: 'text.secondary', mb: 2, lineHeight: 1.7 }}
                      >
                        {card.explanation}
                      </Typography>

                      {/* Phrases */}
                      {card.phrases.length > 0 && (
                        <Box>
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 700,
                              color: brand[600],
                              letterSpacing: '0.05em',
                              mb: 1,
                              display: 'block',
                            }}
                          >
                            USEFUL PHRASES
                          </Typography>
                          <Stack spacing={0.75}>
                            {card.phrases.map((p, i) => (
                              <Box
                                key={i}
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1,
                                  px: 1.5,
                                  py: 0.75,
                                  borderRadius: 2,
                                  bgcolor: alpha(brand[50], 0.8),
                                  border: `1px solid ${alpha(brand[200], 0.3)}`,
                                }}
                              >
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'baseline',
                                      gap: 1,
                                      flexWrap: 'wrap',
                                    }}
                                  >
                                    <Typography
                                      sx={{
                                        fontFamily: (t) => t.fonts.jp,
                                        fontSize: '0.9rem',
                                        color: 'text.primary',
                                        fontWeight: 500,
                                      }}
                                    >
                                      {p.japanese}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: brand[600] }}>
                                      {p.romaji}
                                    </Typography>
                                  </Box>
                                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                    {p.english}
                                  </Typography>
                                </Box>
                                <Tooltip title="Listen">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      speak(p.japanese);
                                    }}
                                    aria-label="Listen to phrase"
                                  >
                                    <VolumeUpIcon sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            ))}
                          </Stack>
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>
              </Card>
            );
          })}
        </Stack>
      </Stack>
    </Container>
  );
}

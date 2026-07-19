'use client';

import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import {
  alpha,
  Box,
  Button,
  Card,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { PageHeader } from '@/components/PageHeader';
import { useSpeech } from '@/hooks/useSpeech';
import { useCultureCards } from '@/hooks/useTravel';
import { logTravelEvent } from '@/lib/supabase';
import { LAYOUT } from '@/theme';
import type { CultureTopic } from '@/types/travel';

import { AuthGatedSaveDialog } from './AuthGatedSaveDialog';

const TOPICS: Array<{ key: CultureTopic | 'all'; icon: string }> = [
  { key: 'all', icon: '📚' },
  { key: 'general', icon: '🇯🇵' },
  { key: 'restaurants', icon: '🍱' },
  { key: 'trains', icon: '🚃' },
  { key: 'shopping', icon: '🛍️' },
  { key: 'onsen', icon: '♨️' },
  { key: 'shrines', icon: '⛩️' },
  { key: 'taboos', icon: '🚫' },
  { key: 'gestures', icon: '🤲' },
];

const IMPORTANCE_CONFIG = {
  essential: {
    color: '#ef4444',
    icon: <PriorityHighIcon sx={{ fontSize: 14 }} />,
  },
  recommended: {
    color: '#f59e0b',
    icon: <InfoOutlinedIcon sx={{ fontSize: 14 }} />,
  },
  nice_to_know: {
    color: '#6366f1',
    icon: <ErrorOutlineIcon sx={{ fontSize: 14 }} />,
  },
};

export function CultureGuide() {
  const t = useTranslations('Travel.culture');
  const theme = useTheme();
  const { brand } = theme.palette;
  const router = useRouter();
  const { speak } = useSpeech();
  const { getCards } = useCultureCards();
  const [activeTopic, setActiveTopic] = useState<CultureTopic | 'all'>('general');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [phrasesToSave, setPhrasesToSave] = useState<
    Array<{ japanese: string; romaji: string; english: string }>
  >([]);

  useEffect(() => {
    logTravelEvent('culture', 'view');
  }, []);

  const filteredCards = getCards(activeTopic);

  return (
    <Box
      sx={{ maxWidth: LAYOUT.narrowMaxWidth, mx: 'auto', px: LAYOUT.pagePx, py: { xs: 3, sm: 4 } }}
    >
      <Stack spacing={3}>
        {/* Header */}
        <PageHeader
          title={t('title')}
          subtitle={t('intro')}
          onBack={() => router.push('/travel')}
          mb={0}
          action={
            <Button
              variant="outlined"
              size="small"
              startIcon={<LibraryAddIcon sx={{ fontSize: 14 }} />}
              onClick={() => {
                const allPhrases = filteredCards.flatMap((c) =>
                  c.phrases.map((p) => ({
                    japanese: p.japanese,
                    romaji: p.romaji,
                    english: p.english,
                  })),
                );
                setPhrasesToSave(allPhrases);
                setSaveDialogOpen(true);
              }}
              sx={{ textTransform: 'none', borderRadius: '20px', fontSize: '0.72rem' }}
            >
              {t('saveAll')}
            </Button>
          }
        />

        {/* Topic filter */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {TOPICS.map((topic) => (
            <Chip
              key={topic.key}
              label={`${topic.icon} ${t(`topics.${topic.key}`)}`}
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
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
            gap: 1.5,
          }}
        >
          {filteredCards.map((card) => {
            const importance = IMPORTANCE_CONFIG[card.importance];

            return (
              <Card
                key={card.id}
                sx={{
                  borderRadius: 3,
                  overflow: 'hidden',
                  border: `1px solid ${alpha(brand[300], 0.3)}`,
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
                      label={t(`importance.${card.importance}`)}
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

                  {/* Details */}
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
                          {t('usefulPhrases')}
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
                              <Tooltip title={t('listen')}>
                                <IconButton
                                  size="small"
                                  onClick={() => speak(p.japanese)}
                                  aria-label={t('listenToPhrase')}
                                >
                                  <VolumeUpIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={t('saveToDeck')}>
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setPhrasesToSave([
                                      {
                                        japanese: p.japanese,
                                        romaji: p.romaji,
                                        english: p.english,
                                      },
                                    ]);
                                    setSaveDialogOpen(true);
                                  }}
                                  aria-label={t('saveToDeck')}
                                >
                                  <BookmarkBorderIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Card>
            );
          })}
        </Box>
      </Stack>

      <AuthGatedSaveDialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        phrases={phrasesToSave}
        onSaved={() => {}}
        defaultDeckName={`⛩️ ${t('defaultDeckName')}`}
      />
    </Box>
  );
}

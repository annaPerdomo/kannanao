'use client';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import LibraryAddCheckIcon from '@mui/icons-material/LibraryAddCheck';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import ReplayIcon from '@mui/icons-material/Replay';
import SendIcon from '@mui/icons-material/Send';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import {
  Alert,
  alpha,
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';

import { useTravelDisplay } from '@/contexts/TravelDisplayContext';
import { useSpeech } from '@/hooks/useSpeech';
import { useScenario } from '@/hooks/useTravel';
import { logTravelEvent } from '@/lib/supabase';
import type { ScenarioCategory } from '@/types/travel';

import { Loading } from '../Loading';
import { SaveToDeckDialog } from './SaveToDeckDialog';
import { TravelPhrase } from './TravelPhrase';

interface ScenarioConfig {
  category: ScenarioCategory;
  title: string;
  icon: string;
  description: string;
  setting: string;
}

const SCENARIOS: ScenarioConfig[] = [
  {
    category: 'restaurant',
    title: 'Ordering Ramen',
    icon: '🍜',
    description: 'You walk into a bustling ramen shop. Time to order!',
    setting: 'A small ramen shop with counter seating and a ticket vending machine by the door.',
  },
  {
    category: 'convenience_store',
    title: 'Konbini Run',
    icon: '🏪',
    description: 'Quick stop at the convenience store for snacks and essentials.',
    setting: 'A brightly-lit 7-Eleven in Tokyo. The cashier greets you as you approach.',
  },
  {
    category: 'train',
    title: 'Train Navigation',
    icon: '🚃',
    description: 'Figure out which train to take and where to transfer.',
    setting:
      'Shinjuku Station — one of the busiest stations in the world. You need to find the right platform.',
  },
  {
    category: 'hotel',
    title: 'Hotel Check-in',
    icon: '🏨',
    description: 'Arrive at your hotel and check in to your room.',
    setting: 'The lobby of a mid-range business hotel. A polite receptionist awaits.',
  },
  {
    category: 'shopping',
    title: 'Souvenir Shopping',
    icon: '🛍️',
    description: 'Find the perfect souvenirs and navigate a Japanese store.',
    setting: 'A souvenir shop in Asakusa near Senso-ji temple. Lots of colorful goods displayed.',
  },
  {
    category: 'taxi',
    title: 'Taxi Ride',
    icon: '🚕',
    description: 'Hail a taxi and communicate your destination.',
    setting: 'Evening in Shibuya. You wave down a taxi — the door opens automatically!',
  },
  {
    category: 'emergency',
    title: 'Getting Help',
    icon: '🆘',
    description: 'You need assistance — practice asking for help.',
    setting:
      "You realize you're lost in an unfamiliar neighborhood. A koban (police box) is nearby.",
  },
  {
    category: 'greeting',
    title: 'Meeting Someone',
    icon: '🤝',
    description: 'Practice casual social greetings and introductions.',
    setting: 'A friend of a friend invited you to a small gathering. Time for introductions.',
  },
];

export function ScenarioPlayer() {
  const theme = useTheme();
  const { brand } = theme.palette;
  const router = useRouter();
  const { speak } = useSpeech();
  const { mode: displayMode } = useTravelDisplay();
  const { turns, loading, error, savedPhrases, startScenario, respond, savePhrase, reset } =
    useScenario();
  const [activeScenario, setActiveScenario] = useState<ScenarioConfig | null>(null);
  const [userInput, setUserInput] = useState('');
  const [deckDialogOpen, setDeckDialogOpen] = useState(false);
  const [deckSaved, setDeckSaved] = useState(false);
  const [pendingSavePhrases, setPendingSavePhrases] = useState<
    Array<{ japanese: string; romaji: string; english: string }>
  >([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const handleStart = (scenario: ScenarioConfig) => {
    setActiveScenario(scenario);
    setDeckSaved(false);
    startScenario(scenario.category, scenario.setting, displayMode);
    logTravelEvent('scenario', 'start', { category: scenario.category });
  };

  const handleSend = useCallback(() => {
    if (!userInput.trim() || !activeScenario || loading) return;
    respond(activeScenario.category, activeScenario.setting, userInput.trim(), displayMode);
    logTravelEvent('scenario', 'respond', { category: activeScenario.category });
    setUserInput('');
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [userInput, activeScenario, loading, respond, displayMode]);

  const handleBack = () => {
    setActiveScenario(null);
    reset();
  };

  const isSaved = useCallback(
    (japanese: string) => savedPhrases.some((p) => p.japanese === japanese),
    [savedPhrases],
  );

  const handleSavePhrase = useCallback(
    (phrase: { japanese: string; romaji: string; english: string }) => {
      savePhrase(phrase);
      setPendingSavePhrases([phrase]);
      setDeckDialogOpen(true);
    },
    [savePhrase],
  );

  const handleSaveAll = useCallback(() => {
    setPendingSavePhrases(savedPhrases);
    setDeckDialogOpen(true);
  }, [savedPhrases]);

  // Scenario selection screen
  if (!activeScenario) {
    return (
      <Container maxWidth="md" sx={{ py: { xs: 3, sm: 4 }, px: { xs: 2, sm: 3 } }}>
        <Stack spacing={3}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <IconButton onClick={() => router.push('/travel')} aria-label="Back to travel hub">
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h5" sx={{ color: 'text.primary' }}>
                Scenario Practice
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                Type in English, learn the Japanese
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              gap: 1.5,
            }}
          >
            {SCENARIOS.map((s) => (
              <Box
                key={s.category}
                onClick={() => handleStart(s)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleStart(s);
                  }
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 2,
                  cursor: 'pointer',
                  borderRadius: '16px',
                  bgcolor: 'background.paper',
                  border: `1px solid ${alpha(brand[300], 0.2)}`,
                  boxShadow: `0 1px 3px ${alpha(brand[400], 0.08)}`,
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: `0 8px 24px ${alpha(brand[400], 0.15)}`,
                    borderColor: alpha(brand[400], 0.35),
                    '& .scenario-icon': { transform: 'scale(1.08)' },
                  },
                  '&:active': { transform: 'translateY(0)' },
                }}
              >
                <Box
                  className="scenario-icon"
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha(brand[100], 0.6),
                    border: `1px solid ${alpha(brand[200], 0.4)}`,
                    flexShrink: 0,
                    transition: 'transform 0.25s ease',
                  }}
                >
                  <Typography sx={{ fontSize: '1.4rem', lineHeight: 1 }}>{s.icon}</Typography>
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      color: 'text.primary',
                      lineHeight: 1.3,
                    }}
                  >
                    {s.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: 'text.secondary', lineHeight: 1.4, fontSize: '0.78rem', mt: 0.25 }}
                  >
                    {s.description}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Stack>
      </Container>
    );
  }

  // Active scenario — conversation view
  const lastTurn = turns[turns.length - 1];
  const isEnded = lastTurn?.isEnding;

  return (
    <Container maxWidth="md" sx={{ py: { xs: 3, sm: 4 }, px: { xs: 2, sm: 3 } }}>
      <Stack spacing={2.5}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            pb: 2,
            borderBottom: `1px solid ${alpha(brand[200], 0.4)}`,
          }}
        >
          <IconButton onClick={handleBack} aria-label="Back to scenarios">
            <ArrowBackIcon />
          </IconButton>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(brand[100], 0.6),
              border: `1px solid ${alpha(brand[200], 0.4)}`,
            }}
          >
            <Typography sx={{ fontSize: '1.1rem', lineHeight: 1 }}>
              {activeScenario.icon}
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: '1rem',
                color: 'text.primary',
                lineHeight: 1.2,
              }}
            >
              {activeScenario.title}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Say what you want in English
            </Typography>
          </Box>
          {savedPhrases.length > 0 && (
            <Chip
              icon={<LibraryAddCheckIcon sx={{ fontSize: '14px !important' }} />}
              label={`${savedPhrases.length}`}
              size="small"
              sx={{
                height: 24,
                fontSize: '0.7rem',
                fontWeight: 700,
                bgcolor: alpha(brand[500], 0.1),
                color: brand[700],
                '& .MuiChip-label': { px: 0.5 },
              }}
            />
          )}
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        {/* Conversation turns */}
        {turns.map((turn, i) => (
          <Box key={i}>
            {/* Context — shown before NPC speaks */}
            {(i === 0 || turn.context !== turns[i - 1]?.context) && (
              <Box
                sx={{
                  textAlign: 'center',
                  mb: 1.5,
                  py: 1,
                  px: 2,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontStyle: 'italic',
                    color: 'text.secondary',
                    fontSize: '0.72rem',
                    lineHeight: 1.5,
                  }}
                >
                  {turn.context}
                </Typography>
              </Box>
            )}

            {/* NPC Speech Bubble */}
            <Box sx={{ mb: 2, maxWidth: '92%' }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: alpha(brand[100], 0.8),
                    border: `1px solid ${alpha(brand[200], 0.5)}`,
                    flexShrink: 0,
                    mt: 0.5,
                  }}
                >
                  <RecordVoiceOverIcon sx={{ color: brand[600], fontSize: 14 }} />
                </Box>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: '16px',
                    borderTopLeftRadius: '4px',
                    bgcolor: alpha(brand[50], 0.8),
                    border: `1px solid ${alpha(brand[200], 0.4)}`,
                    flex: 1,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: 1 }}>
                      <TravelPhrase
                        japanese={turn.npcJapanese}
                        romaji={turn.npcRomaji}
                        primarySize="1.1rem"
                        secondarySize="0.8rem"
                      />
                    </Box>
                    <Tooltip title="Listen">
                      <IconButton
                        size="small"
                        onClick={() => speak(turn.npcJapanese)}
                        aria-label="Listen to pronunciation"
                        sx={{ p: 0.5 }}
                      >
                        <VolumeUpIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={isSaved(turn.npcJapanese) ? 'Saved' : 'Save to deck'}>
                      <IconButton
                        size="small"
                        onClick={() =>
                          handleSavePhrase({
                            japanese: turn.npcJapanese,
                            romaji: turn.npcRomaji,
                            english: turn.npcEnglish,
                          })
                        }
                        aria-label="Save NPC phrase"
                        sx={{
                          p: 0.5,
                          color: isSaved(turn.npcJapanese) ? brand[600] : alpha(brand[400], 0.6),
                        }}
                      >
                        {isSaved(turn.npcJapanese) ? (
                          <LibraryAddCheckIcon sx={{ fontSize: 14 }} />
                        ) : (
                          <LibraryAddIcon sx={{ fontSize: 14 }} />
                        )}
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{ color: 'text.secondary', mt: 0.5, fontSize: '0.82rem' }}
                  >
                    {turn.npcEnglish}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* User's coached phrase (if they responded) */}
            {turn.userJapanese && (
              <Box sx={{ mb: 2, ml: 'auto', maxWidth: '92%' }}>
                {/* What the user wanted to say */}
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.disabled',
                    mb: 0.5,
                    display: 'block',
                    textAlign: 'right',
                    fontSize: '0.7rem',
                  }}
                >
                  &ldquo;{turn.userIntent}&rdquo;
                </Typography>

                {/* Coached phrase card */}
                <Box
                  sx={{
                    p: 2,
                    borderRadius: '16px',
                    borderTopRightRadius: '4px',
                    background: `linear-gradient(135deg, ${alpha(brand[500], 0.06)}, ${alpha(brand[400], 0.03)})`,
                    border: `1px solid ${alpha(brand[400], 0.2)}`,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                    <AutoAwesomeIcon sx={{ color: brand[500], fontSize: 14 }} />
                    <Typography
                      variant="caption"
                      sx={{
                        color: brand[600],
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        fontSize: '0.65rem',
                      }}
                    >
                      SAY THIS
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: 1 }}>
                      <TravelPhrase
                        japanese={turn.userJapanese!}
                        romaji={turn.userRomaji!}
                        primarySize="1.15rem"
                        secondarySize="0.8rem"
                      />
                    </Box>
                    <Tooltip title="Listen">
                      <IconButton
                        size="small"
                        onClick={() => speak(turn.userJapanese!)}
                        aria-label="Listen to phrase"
                        sx={{ p: 0.5 }}
                      >
                        <VolumeUpIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={isSaved(turn.userJapanese!) ? 'Saved' : 'Save to deck'}>
                      <IconButton
                        size="small"
                        onClick={() =>
                          handleSavePhrase({
                            japanese: turn.userJapanese!,
                            romaji: turn.userRomaji!,
                            english: turn.userEnglish ?? turn.userIntent!,
                          })
                        }
                        aria-label="Save phrase"
                        sx={{
                          p: 0.5,
                          color: isSaved(turn.userJapanese!) ? brand[600] : alpha(brand[400], 0.6),
                        }}
                      >
                        {isSaved(turn.userJapanese!) ? (
                          <LibraryAddCheckIcon sx={{ fontSize: 14 }} />
                        ) : (
                          <LibraryAddIcon sx={{ fontSize: 14 }} />
                        )}
                      </IconButton>
                    </Tooltip>
                  </Box>
                  {turn.userEnglish && (
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.secondary', fontSize: '0.75rem' }}
                    >
                      {turn.userEnglish}
                    </Typography>
                  )}

                  {/* Explanation */}
                  {turn.explanation && (
                    <Box
                      sx={{
                        mt: 1.5,
                        pt: 1.5,
                        borderTop: `1px solid ${alpha(brand[200], 0.3)}`,
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{ color: 'text.secondary', fontSize: '0.78rem', mb: 1 }}
                      >
                        {turn.explanation}
                      </Typography>

                      {/* Alternative */}
                      {turn.alternative && turn.alternative !== turn.userJapanese && (
                        <Box
                          sx={{
                            p: 1.5,
                            borderRadius: '10px',
                            bgcolor: alpha(brand[100], 0.4),
                            border: `1px solid ${alpha(brand[200], 0.3)}`,
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              color: brand[600],
                              fontWeight: 700,
                              fontSize: '0.6rem',
                              letterSpacing: '0.04em',
                            }}
                          >
                            SIMPLER ALTERNATIVE
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                            <Box sx={{ flex: 1 }}>
                              <TravelPhrase
                                japanese={turn.alternative!}
                                romaji={turn.alternativeRomaji!}
                                primarySize="0.95rem"
                                secondarySize="0.72rem"
                              />
                            </Box>
                            <Tooltip title="Listen">
                              <IconButton
                                size="small"
                                onClick={() => speak(turn.alternative!)}
                                aria-label="Listen to alternative"
                                sx={{ p: 0.5 }}
                              >
                                <VolumeUpIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={isSaved(turn.alternative!) ? 'Saved' : 'Save to deck'}>
                              <IconButton
                                size="small"
                                onClick={() =>
                                  handleSavePhrase({
                                    japanese: turn.alternative!,
                                    romaji: turn.alternativeRomaji!,
                                    english: turn.alternativeExplanation ?? turn.userIntent!,
                                  })
                                }
                                aria-label="Save alternative"
                                sx={{
                                  p: 0.5,
                                  color: isSaved(turn.alternative!)
                                    ? brand[600]
                                    : alpha(brand[400], 0.6),
                                }}
                              >
                                {isSaved(turn.alternative!) ? (
                                  <LibraryAddCheckIcon sx={{ fontSize: 14 }} />
                                ) : (
                                  <LibraryAddIcon sx={{ fontSize: 14 }} />
                                )}
                              </IconButton>
                            </Tooltip>
                          </Box>
                          {turn.alternativeExplanation && (
                            <Typography
                              variant="caption"
                              sx={{
                                color: 'text.secondary',
                                display: 'block',
                                fontSize: '0.72rem',
                              }}
                            >
                              {turn.alternativeExplanation}
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>
              </Box>
            )}

            {/* Cultural tip */}
            {turn.culturalTip && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1,
                  px: 2,
                  py: 1.25,
                  mb: 1,
                  borderRadius: '10px',
                  background: alpha('#f59e0b', 0.05),
                  border: `1px solid ${alpha('#f59e0b', 0.12)}`,
                }}
              >
                <LightbulbIcon sx={{ color: '#f59e0b', fontSize: 14, mt: 0.25 }} />
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem' }}>
                  {turn.culturalTip}
                </Typography>
              </Box>
            )}
          </Box>
        ))}

        {/* Loading */}
        {loading && turns.length === 0 && <Loading message="Setting the scene..." />}
        {loading && turns.length > 0 && <Loading message="Thinking..." />}

        {/* User input area */}
        {!isEnded && turns.length > 0 && !loading && (
          <Box
            sx={{
              pt: 2,
              borderTop: `1px solid ${alpha(brand[200], 0.3)}`,
            }}
          >
            {/* Suggested responses */}
            {lastTurn?.suggestedResponses && lastTurn.suggestedResponses.length > 0 && (
              <Box sx={{ mb: 1.5 }}>
                <Typography
                  variant="caption"
                  sx={{ color: 'text.disabled', mb: 0.75, display: 'block', fontSize: '0.68rem' }}
                >
                  Suggestions:
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                  {lastTurn.suggestedResponses.map((suggestion, i) => (
                    <Chip
                      key={i}
                      label={suggestion}
                      size="small"
                      onClick={() => setUserInput(suggestion)}
                      sx={{
                        borderRadius: '20px',
                        fontSize: '0.73rem',
                        height: 28,
                        cursor: 'pointer',
                        bgcolor: alpha(brand[50], 0.8),
                        border: `1px solid ${alpha(brand[300], 0.3)}`,
                        transition: 'all 0.15s',
                        '&:hover': {
                          bgcolor: alpha(brand[100], 0.8),
                          borderColor: alpha(brand[400], 0.4),
                        },
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Text input */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                fullWidth
                size="small"
                placeholder="What do you want to say?"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '20px',
                    fontSize: '0.88rem',
                    bgcolor: 'background.paper',
                  },
                }}
              />
              <IconButton
                onClick={handleSend}
                disabled={!userInput.trim() || loading}
                aria-label="Send"
                sx={{
                  bgcolor: brand[500],
                  color: '#fff',
                  borderRadius: '50%',
                  width: 38,
                  height: 38,
                  flexShrink: 0,
                  '&:hover': { bgcolor: brand[600] },
                  '&.Mui-disabled': { bgcolor: alpha(brand[300], 0.3), color: alpha('#fff', 0.5) },
                }}
              >
                <SendIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          </Box>
        )}

        {/* Scenario ended */}
        {isEnded && (
          <Box
            sx={{
              p: 3,
              borderRadius: '16px',
              background: alpha('#10b981', 0.04),
              border: `1px solid ${alpha('#10b981', 0.15)}`,
              textAlign: 'center',
            }}
          >
            <Typography
              sx={{ fontWeight: 700, fontSize: '0.95rem', color: 'text.primary', mb: 0.75 }}
            >
              Conversation complete!
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', mb: 2, fontSize: '0.82rem' }}
            >
              {savedPhrases.length > 0
                ? `You saved ${savedPhrases.length} phrase${savedPhrases.length > 1 ? 's' : ''}. Save them to a deck to practice later!`
                : 'Try another scenario or save some phrases next time!'}
            </Typography>
            <Stack direction="row" spacing={1.5} justifyContent="center" flexWrap="wrap">
              <Button
                startIcon={<ReplayIcon />}
                onClick={() => handleStart(activeScenario)}
                variant="outlined"
                size="small"
                sx={{ textTransform: 'none', borderRadius: '20px', fontSize: '0.8rem' }}
              >
                Replay
              </Button>
              {savedPhrases.length > 0 && !deckSaved && (
                <Button
                  startIcon={<LibraryAddIcon />}
                  onClick={handleSaveAll}
                  variant="contained"
                  size="small"
                  sx={{ textTransform: 'none', borderRadius: '20px', fontSize: '0.8rem' }}
                >
                  Save to Deck ({savedPhrases.length})
                </Button>
              )}
              {deckSaved && (
                <Chip
                  icon={<LibraryAddCheckIcon sx={{ fontSize: '14px !important' }} />}
                  label="Saved!"
                  sx={{
                    bgcolor: alpha('#10b981', 0.12),
                    color: '#059669',
                    fontWeight: 600,
                  }}
                />
              )}
            </Stack>
          </Box>
        )}

        {/* Save to deck button — available mid-conversation too */}
        {savedPhrases.length > 0 && !isEnded && !deckSaved && (
          <Box sx={{ textAlign: 'center' }}>
            <Button
              startIcon={<LibraryAddIcon sx={{ fontSize: 14 }} />}
              onClick={handleSaveAll}
              size="small"
              variant="outlined"
              sx={{ textTransform: 'none', borderRadius: '20px', fontSize: '0.75rem' }}
            >
              Save {savedPhrases.length} phrase{savedPhrases.length > 1 ? 's' : ''} to deck
            </Button>
          </Box>
        )}

        <div ref={bottomRef} />
      </Stack>

      <SaveToDeckDialog
        open={deckDialogOpen}
        onClose={() => setDeckDialogOpen(false)}
        phrases={pendingSavePhrases}
        onSaved={() => setDeckSaved(true)}
        defaultDeckName={`${activeScenario?.icon ?? '🗾'} Travel: ${activeScenario?.title ?? 'Scenario'}`}
      />
    </Container>
  );
}

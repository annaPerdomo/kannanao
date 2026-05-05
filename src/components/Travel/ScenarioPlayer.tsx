'use client';

import AddIcon from '@mui/icons-material/Add';
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
  Card,
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

import { useSpeech } from '@/hooks/useSpeech';
import { useScenario } from '@/hooks/useTravel';
import type { ScenarioCategory } from '@/types/travel';

import { Loading } from '../Loading';
import { SaveToDeckDialog } from './SaveToDeckDialog';

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
  const { turns, loading, error, savedPhrases, startScenario, respond, savePhrase, reset } =
    useScenario();
  const [activeScenario, setActiveScenario] = useState<ScenarioConfig | null>(null);
  const [userInput, setUserInput] = useState('');
  const [deckDialogOpen, setDeckDialogOpen] = useState(false);
  const [deckSaved, setDeckSaved] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const handleStart = (scenario: ScenarioConfig) => {
    setActiveScenario(scenario);
    setDeckSaved(false);
    startScenario(scenario.category, scenario.setting);
  };

  const handleSend = useCallback(() => {
    if (!userInput.trim() || !activeScenario || loading) return;
    respond(activeScenario.category, activeScenario.setting, userInput.trim());
    setUserInput('');
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [userInput, activeScenario, loading, respond]);

  const handleBack = () => {
    setActiveScenario(null);
    reset();
  };

  const isSaved = useCallback(
    (japanese: string) => savedPhrases.some((p) => p.japanese === japanese),
    [savedPhrases],
  );

  // Scenario selection screen
  if (!activeScenario) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <IconButton onClick={() => router.push('/travel')} aria-label="Back to travel hub">
              <ArrowBackIcon />
            </IconButton>
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, fontFamily: (t) => t.fonts.display, color: 'text.primary' }}
            >
              Scenario Practice
            </Typography>
          </Box>

          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Practice real conversations in Japan. Type what you want to say in English, and AI will
            teach you the right Japanese phrase and explain why it works.
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              gap: 2,
            }}
          >
            {SCENARIOS.map((s) => (
              <Card
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
                  p: 2.5,
                  cursor: 'pointer',
                  borderRadius: 3,
                  border: `1px solid ${alpha(brand[300], 0.3)}`,
                  background: alpha(brand[50], 0.5),
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: `0 8px 24px ${alpha(brand[400], 0.15)}`,
                    borderColor: alpha(brand[400], 0.5),
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Typography sx={{ fontSize: '1.5rem' }}>{s.icon}</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {s.title}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {s.description}
                </Typography>
              </Card>
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
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={handleBack} aria-label="Back to scenarios">
            <ArrowBackIcon />
          </IconButton>
          <Typography sx={{ fontSize: '1.3rem' }}>{activeScenario.icon}</Typography>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontFamily: (t) => t.fonts.display,
              color: 'text.primary',
              flex: 1,
            }}
          >
            {activeScenario.title}
          </Typography>
          {savedPhrases.length > 0 && (
            <Chip
              icon={<LibraryAddCheckIcon sx={{ fontSize: '14px !important' }} />}
              label={`${savedPhrases.length} saved`}
              size="small"
              sx={{
                height: 24,
                fontSize: '0.7rem',
                fontWeight: 600,
                bgcolor: alpha(brand[500], 0.1),
                color: brand[700],
              }}
            />
          )}
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        {/* Conversation turns */}
        {turns.map((turn, i) => (
          <Box key={i}>
            {/* User's coached phrase (if they responded) */}
            {turn.userJapanese && (
              <Box sx={{ mb: 2 }}>
                {/* What the user wanted to say */}
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', mb: 0.5, display: 'block', px: 1 }}
                >
                  You wanted to say: &ldquo;{turn.userIntent}&rdquo;
                </Typography>

                {/* Coached phrase card */}
                <Card
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    borderTopRightRadius: 0,
                    background: alpha(brand[500], 0.06),
                    border: `1px solid ${alpha(brand[400], 0.25)}`,
                    ml: 'auto',
                    maxWidth: '95%',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <AutoAwesomeIcon sx={{ color: brand[500], fontSize: 18, mt: 0.5 }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" sx={{ color: brand[600], fontWeight: 700 }}>
                        SAY THIS
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                        <Typography
                          sx={{
                            fontFamily: (t) => t.fonts.jp,
                            fontSize: '1.2rem',
                            fontWeight: 600,
                            color: 'text.primary',
                          }}
                        >
                          {turn.userJapanese}
                        </Typography>
                        <Tooltip title="Listen">
                          <IconButton
                            size="small"
                            onClick={() => speak(turn.userJapanese!)}
                            aria-label="Listen to phrase"
                          >
                            <VolumeUpIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip
                          title={isSaved(turn.userJapanese!) ? 'Saved to deck' : 'Add to deck'}
                        >
                          <IconButton
                            size="small"
                            onClick={() =>
                              savePhrase({
                                japanese: turn.userJapanese!,
                                romaji: turn.userRomaji!,
                                english: turn.userEnglish ?? turn.userIntent!,
                              })
                            }
                            aria-label="Save phrase"
                            sx={{
                              color: isSaved(turn.userJapanese!)
                                ? brand[600]
                                : alpha(brand[400], 0.6),
                            }}
                          >
                            {isSaved(turn.userJapanese!) ? (
                              <LibraryAddCheckIcon sx={{ fontSize: 18 }} />
                            ) : (
                              <LibraryAddIcon sx={{ fontSize: 18 }} />
                            )}
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Typography variant="body2" sx={{ color: brand[600], fontStyle: 'italic' }}>
                        {turn.userRomaji}
                      </Typography>
                      {turn.userEnglish && (
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {turn.userEnglish}
                        </Typography>
                      )}

                      {/* Explanation */}
                      {turn.explanation && (
                        <Box
                          sx={{
                            mt: 1.5,
                            pt: 1.5,
                            borderTop: `1px solid ${alpha(brand[200], 0.4)}`,
                          }}
                        >
                          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                            {turn.explanation}
                          </Typography>

                          {/* Alternative */}
                          {turn.alternative && turn.alternative !== turn.userJapanese && (
                            <Box
                              sx={{
                                p: 1.5,
                                borderRadius: 2,
                                bgcolor: alpha(brand[100], 0.5),
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{ color: brand[600], fontWeight: 700 }}
                              >
                                SIMPLER ALTERNATIVE
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                                <Typography
                                  sx={{
                                    fontFamily: (t) => t.fonts.jp,
                                    fontSize: '0.95rem',
                                    color: 'text.primary',
                                  }}
                                >
                                  {turn.alternative}
                                </Typography>
                                <Tooltip title="Listen">
                                  <IconButton
                                    size="small"
                                    onClick={() => speak(turn.alternative!)}
                                    aria-label="Listen to alternative"
                                  >
                                    <VolumeUpIcon sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip
                                  title={
                                    isSaved(turn.alternative!) ? 'Saved to deck' : 'Add to deck'
                                  }
                                >
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      savePhrase({
                                        japanese: turn.alternative!,
                                        romaji: turn.alternativeRomaji!,
                                        english: turn.alternativeExplanation ?? turn.userIntent!,
                                      })
                                    }
                                    aria-label="Save alternative"
                                    sx={{
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
                              <Typography variant="caption" sx={{ color: brand[600] }}>
                                {turn.alternativeRomaji}
                              </Typography>
                              {turn.alternativeExplanation && (
                                <Typography
                                  variant="caption"
                                  sx={{ color: 'text.secondary', display: 'block' }}
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
                </Card>
              </Box>
            )}

            {/* NPC Speech Bubble */}
            <Card
              sx={{
                p: 2,
                borderRadius: 3,
                borderTopLeftRadius: 0,
                background: alpha(brand[100], 0.4),
                border: `1px solid ${alpha(brand[300], 0.3)}`,
                mb: 1,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <RecordVoiceOverIcon sx={{ color: brand[600], mt: 0.5, fontSize: 20 }} />
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      sx={{
                        fontFamily: (t) => t.fonts.jp,
                        fontSize: '1.15rem',
                        fontWeight: 600,
                        color: 'text.primary',
                      }}
                    >
                      {turn.npcJapanese}
                    </Typography>
                    <Tooltip title="Listen">
                      <IconButton
                        size="small"
                        onClick={() => speak(turn.npcJapanese)}
                        aria-label="Listen to pronunciation"
                      >
                        <VolumeUpIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={isSaved(turn.npcJapanese) ? 'Saved to deck' : 'Add to deck'}>
                      <IconButton
                        size="small"
                        onClick={() =>
                          savePhrase({
                            japanese: turn.npcJapanese,
                            romaji: turn.npcRomaji,
                            english: turn.npcEnglish,
                          })
                        }
                        aria-label="Save NPC phrase"
                        sx={{
                          color: isSaved(turn.npcJapanese) ? brand[600] : alpha(brand[400], 0.6),
                        }}
                      >
                        {isSaved(turn.npcJapanese) ? (
                          <LibraryAddCheckIcon sx={{ fontSize: 16 }} />
                        ) : (
                          <LibraryAddIcon sx={{ fontSize: 16 }} />
                        )}
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{ color: brand[700], fontStyle: 'italic', mt: 0.25 }}
                  >
                    {turn.npcRomaji}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                    {turn.npcEnglish}
                  </Typography>
                </Box>
              </Box>
            </Card>

            {/* Context */}
            {(i === 0 || turn.context !== turns[i - 1]?.context) && (
              <Typography
                variant="caption"
                sx={{ fontStyle: 'italic', color: 'text.secondary', px: 1 }}
              >
                {turn.context}
              </Typography>
            )}

            {/* Cultural tip */}
            {turn.culturalTip && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1,
                  px: 2,
                  py: 1.5,
                  mt: 1,
                  borderRadius: 2,
                  background: alpha('#f59e0b', 0.06),
                  border: `1px solid ${alpha('#f59e0b', 0.15)}`,
                }}
              >
                <LightbulbIcon sx={{ color: '#f59e0b', fontSize: 16, mt: 0.25 }} />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
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
          <Box>
            {/* Suggested responses */}
            {lastTurn?.suggestedResponses && lastTurn.suggestedResponses.length > 0 && (
              <Box sx={{ mb: 1.5 }}>
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', mb: 0.75, display: 'block' }}
                >
                  Ideas for what to say:
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                  {lastTurn.suggestedResponses.map((suggestion, i) => (
                    <Chip
                      key={i}
                      label={suggestion}
                      size="small"
                      onClick={() => setUserInput(suggestion)}
                      sx={{
                        borderRadius: 2,
                        fontSize: '0.75rem',
                        height: 28,
                        cursor: 'pointer',
                        borderColor: alpha(brand[300], 0.4),
                        '&:hover': { bgcolor: alpha(brand[100], 0.5) },
                      }}
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Text input */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Type what you want to say in English..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': { borderRadius: 3 },
                }}
              />
              <IconButton
                onClick={handleSend}
                disabled={!userInput.trim() || loading}
                aria-label="Send"
                sx={{
                  bgcolor: brand[500],
                  color: '#fff',
                  borderRadius: 3,
                  width: 40,
                  height: 40,
                  '&:hover': { bgcolor: brand[600] },
                  '&.Mui-disabled': { bgcolor: alpha(brand[300], 0.3), color: alpha('#fff', 0.5) },
                }}
              >
                <SendIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
          </Box>
        )}

        {/* Scenario ended */}
        {isEnded && (
          <Card
            sx={{
              p: 3,
              borderRadius: 3,
              background: alpha('#10b981', 0.06),
              border: `1px solid ${alpha('#10b981', 0.2)}`,
              textAlign: 'center',
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>
              Conversation complete!
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
              {savedPhrases.length > 0
                ? `You saved ${savedPhrases.length} phrase${savedPhrases.length > 1 ? 's' : ''}. Create a deck to practice them!`
                : 'Try another scenario or save some phrases next time!'}
            </Typography>
            <Stack direction="row" spacing={1.5} justifyContent="center">
              <Button
                startIcon={<ReplayIcon />}
                onClick={() => handleStart(activeScenario)}
                variant="outlined"
                size="small"
                sx={{ textTransform: 'none', borderRadius: 2 }}
              >
                Replay
              </Button>
              {savedPhrases.length > 0 && !deckSaved && (
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => setDeckDialogOpen(true)}
                  variant="contained"
                  size="small"
                  sx={{ textTransform: 'none', borderRadius: 2 }}
                >
                  Save to Deck ({savedPhrases.length} cards)
                </Button>
              )}
              {deckSaved && (
                <Chip
                  icon={<LibraryAddCheckIcon sx={{ fontSize: '14px !important' }} />}
                  label="Deck created! Find it in your Decks."
                  sx={{
                    bgcolor: alpha('#10b981', 0.12),
                    color: '#059669',
                    fontWeight: 600,
                  }}
                />
              )}
            </Stack>
          </Card>
        )}

        {/* Save to deck button — available mid-conversation too */}
        {savedPhrases.length > 0 && !isEnded && !deckSaved && (
          <Box sx={{ textAlign: 'center' }}>
            <Button
              startIcon={<AddIcon />}
              onClick={() => setDeckDialogOpen(true)}
              size="small"
              variant="outlined"
              sx={{ textTransform: 'none', borderRadius: 2, fontSize: '0.75rem' }}
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
        phrases={savedPhrases}
        onSaved={() => setDeckSaved(true)}
        defaultDeckName={`${activeScenario?.icon ?? '🗾'} Travel: ${activeScenario?.title ?? 'Scenario'}`}
      />
    </Container>
  );
}

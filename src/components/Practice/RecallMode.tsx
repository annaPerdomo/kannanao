"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  LinearProgress,
  Chip,
  Stack,
} from "@mui/material";
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import type { Flashcard } from "@/types/flashcard";
import { getFlashcardDisplayText } from "@/lib/flashcardUtils";
import { useProgress } from "@/hooks/useProgess";

interface RecallModeProps {
  cards: Flashcard[];
  deckId: string;
  onExit: () => void;
}

export function RecallMode({ cards, deckId, onExit }: RecallModeProps) {
  const theme = useTheme();
  const { brand, surfaces } = theme.palette;

  const pool = useMemo(
    () => [...cards].sort(() => Math.random() - 0.5),
    [cards],
  );
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [score, setScore] = useState(0);
  const [hintLevel, setHintLevel] = useState(0); // 0=none, 1=first char hint, 2=full meaning

  const { startSession, recordAnswer, endSession } = useProgress();
  const sessionIdRef = useRef<string>("");
  const startTimeRef = useRef<number>(Date.now());
  const correctCountRef = useRef(0);

  useEffect(() => {
    startSession(deckId, 'recall').then((id) => {
      sessionIdRef.current = id;
      startTimeRef.current = Date.now();
    });
  }, [deckId, startSession]);

  const card = pool[index];
  const display = getFlashcardDisplayText(card);
  const done = index >= pool.length;

  // Build progressive hint text
  const hintText = useMemo(() => {
    if (!card) return "";
    if (hintLevel === 0) return "";
    const target = card.reading || card.word;
    if (hintLevel === 1) {
      // Show first character + dashes for the rest
      return target[0] + "_ ".repeat(target.length - 1).trim();
    }
    return card.meaning;
  }, [card, hintLevel]);

  const check = async () => {
    const answer = input.trim().toLowerCase();
    const correct =
      answer === card.word ||
      answer === card.reading ||
      answer === card.meaning.toLowerCase();
    setResult(correct ? "correct" : "wrong");
    if (correct) {
      setScore((s) => s + 1);
      correctCountRef.current += 1;
    }
    if (sessionIdRef.current) {
      await recordAnswer(sessionIdRef.current, correct, card.jlptLevel);
    }
  };

  const next = () => {
    setIndex((i) => i + 1);
    setInput("");
    setResult(null);
    setHintLevel(0);
  };

  const handleExit = async () => {
    if (sessionIdRef.current) {
      await endSession(sessionIdRef.current, {
        cardsStudied: index,
        cardsCorrect: correctCountRef.current,
        durationSecs: Math.round((Date.now() - startTimeRef.current) / 1000),
      });
    }
    onExit();
  };

  // End session when all cards are done
  useEffect(() => {
    if (done && sessionIdRef.current) {
      endSession(sessionIdRef.current, {
        cardsStudied: pool.length,
        cardsCorrect: correctCountRef.current,
        durationSecs: Math.round((Date.now() - startTimeRef.current) / 1000),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  if (done) {
    return (
      <Box sx={{ textAlign: "center", py: 6 }}>
        <CheckIcon sx={{ fontSize: 56, color: "success.main", mb: 2 }} />
        <Typography variant="h4" sx={{ mb: 1 }}>
          Session Complete!
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          {score} / {pool.length} recalled correctly
        </Typography>
        <Button variant="outlined" onClick={onExit}>
          Back to Deck
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h5">Recall</Typography>
        <Chip label={`${index + 1} / ${pool.length}`} />
      </Box>

      <LinearProgress
        variant="determinate"
        value={(index / pool.length) * 100}
        sx={{
          mb: 4,
          height: 3,
          borderRadius: 1,
          bgcolor: alpha(brand[300], 0.12),
          "& .MuiLinearProgress-bar": { bgcolor: "primary.main" },
        }}
      />

      {/* Image prompt — shown clearly so user can recall the word */}
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: 220,
          borderRadius: 3,
          overflow: "hidden",
          mb: 0,
          border: `1px solid ${alpha(brand[300], 0.45)}`,
          bgcolor: surfaces.input,
          boxShadow: `0 10px 26px ${alpha(brand[300], 0.12)}`,
        }}
      >
        {card.imageUrl ? (
          <>
            <Box
              component="img"
              src={card.imageUrl}
              alt="recall prompt"
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transition: "opacity 0.3s",
              }}
            />
            {/* Subtle bottom gradient label */}
            <Box
              sx={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                px: 2,
                py: 1,
                background:
                  "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: "rgba(255,255,255,0.75)",
                  letterSpacing: "0.08em",
                  fontSize: "0.65rem",
                }}
              >
                WHAT IS THIS WORD?
              </Typography>
              {result && (
                <Box
                  sx={{
                    px: 1,
                    py: 0.25,
                    borderRadius: 1,
                    bgcolor:
                      result === "correct"
                        ? "rgba(126,184,154,0.85)"
                        : "rgba(224,112,112,0.85)",
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: "#fff", fontSize: "0.65rem" }}
                  >
                    {result === "correct" ? "Correct!" : "Incorrect"}
                  </Typography>
                </Box>
              )}
            </Box>
          </>
        ) : (
          /* No image: show example sentence as a visual cue */
          <Box
            sx={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              px: 3,
              gap: 1.5,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: "text.disabled",
                letterSpacing: "0.1em",
                fontSize: "0.65rem",
              }}
            >
              WHAT WORD MATCHES?
            </Typography>
            {card.example_jp && (
              <Typography
                sx={{
                  fontFamily: '"Noto Serif JP", serif',
                  fontSize: "1rem",
                  color: "text.primary",
                  textAlign: "center",
                  lineHeight: 1.8,
                }}
              >
                {card.example_jp}
              </Typography>
            )}
            {card.example_en && (
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", textAlign: "center" }}
              >
                {card.example_en}
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* Hint row — sits just below the image */}
      {!result && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 1,
            mt: 1,
            mb: 2,
            minHeight: 28,
          }}
        >
          {hintLevel > 0 && (
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontStyle: "italic",
                mr: "auto",
              }}
            >
              {hintText}
            </Typography>
          )}
          {hintLevel < 2 && (
            <Button
              size="small"
              variant="text"
              startIcon={<LightbulbOutlinedIcon sx={{ fontSize: "0.9rem" }} />}
              onClick={() => setHintLevel((l) => l + 1)}
              sx={{
                fontSize: "0.7rem",
                color: "text.secondary",
                py: 0,
                minWidth: 0,
                "&:hover": { color: "primary.main" },
              }}
            >
              {hintLevel === 0 ? "Hint" : "More"}
            </Button>
          )}
        </Box>
      )}
      {result && <Box sx={{ mb: 2 }} />}

      {result && (
        <Box
          sx={{
            p: 2,
            borderRadius: 1,
            border: "1px solid",
            borderColor: result === "correct" ? "success.main" : "error.main",
            bgcolor:
              result === "correct"
                ? "rgba(126,184,154,0.08)"
                : "rgba(224,112,112,0.08)",
            mb: 2,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          {result === "correct" ? (
            <CheckIcon sx={{ color: "success.main" }} />
          ) : (
            <CloseIcon sx={{ color: "error.main" }} />
          )}
          <Box>
            <Typography
              sx={{
                fontFamily: '"Noto Serif JP", serif',
                fontSize: "1.1rem",
                color: "text.primary",
              }}
            >
              {display.titleText}
            </Typography>
            {display.subtitleText ? (
              <Typography variant="caption" sx={{ color: "primary.main" }}>
                {display.subtitleText} — {card.meaning}
              </Typography>
            ) : card.mainViewMode === "hiragana" &&
              card.word !== display.titleText ? (
              <Typography variant="caption" sx={{ color: "primary.main" }}>
                {card.word} — {card.meaning}
              </Typography>
            ) : (
              <Typography variant="caption" sx={{ color: "primary.main" }}>
                {card.meaning}
              </Typography>
            )}
          </Box>
        </Box>
      )}

      <Stack direction="row" spacing={1.5} alignItems="flex-end">
        <TextField
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !result) check();
          }}
          label="Type the word, reading, or meaning"
          disabled={!!result}
          fullWidth
          size="small"
          autoFocus
        />
        {!result ? (
          <Button
            variant="contained"
            onClick={check}
            disabled={!input.trim()}
            sx={{ flexShrink: 0 }}
          >
            Check
          </Button>
        ) : (
          <Button variant="outlined" onClick={next} sx={{ flexShrink: 0 }}>
            Next
          </Button>
        )}
      </Stack>

      <Box sx={{ mt: 3, textAlign: "right" }}>
        <Button
          size="small"
          color="inherit"
          onClick={handleExit}
          sx={{ opacity: 0.5 }}
        >
          Quit &amp; Save Progress
        </Button>
      </Box>
    </Box>
  );
}

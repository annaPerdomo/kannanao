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
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import type { Flashcard } from "@/types/flashcard";
import { getFlashcardDisplayText } from "@/lib/flashcardUtils";
import { useProgress } from "@/hooks/useProgess";

interface RecallModeProps {
  cards: Flashcard[];
  deckId: string;
  onExit: () => void;
}

export function RecallMode({ cards, deckId, onExit }: RecallModeProps) {
  const pool = useMemo(
    () => [...cards].sort(() => Math.random() - 0.5),
    [cards],
  );
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [score, setScore] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const { startSession, recordAnswer, endSession } = useProgress();
  const sessionIdRef = useRef<string>("");
  const startTimeRef = useRef<number>(Date.now());
  const correctCountRef = useRef(0);

  useEffect(() => {
    startSession(deckId).then((id) => {
      sessionIdRef.current = id;
      startTimeRef.current = Date.now();
    });
  }, [deckId, startSession]);

  const card = pool[index];
  const display = getFlashcardDisplayText(card);
  const done = index >= pool.length;

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
      await recordAnswer(sessionIdRef.current, correct);
    }
  };

  const next = () => {
    setIndex((i) => i + 1);
    setInput("");
    setResult(null);
    setShowHint(false);
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
          bgcolor: "rgba(200,169,126,0.1)",
          "& .MuiLinearProgress-bar": { bgcolor: "primary.main" },
        }}
      />

      {/* Image prompt */}
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: 200,
          borderRadius: 3,
          overflow: "hidden",
          mb: 3,
          border: "1px solid rgba(249,168,212,0.45)",
          bgcolor: "#FFF2F8",
          boxShadow: "0 10px 26px rgba(249,168,212,0.12)",
        }}
      >
        {card.imageUrl ? (
          <>
            <Box
              component="img"
              src={card.imageUrl}
              alt="prompt"
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                filter: result ? "none" : "blur(8px) brightness(0.5)",
                transition: "filter 0.4s",
              }}
            />
            {!result && (
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: "rgba(240,237,230,0.6)",
                    letterSpacing: "0.1em",
                  }}
                >
                  WHAT IS THIS WORD?
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: "primary.main",
                    letterSpacing: "0.08em",
                    cursor: "pointer",
                    "&:hover": { textDecoration: "underline" },
                  }}
                  onClick={() => setShowHint(true)}
                >
                  {showHint ? card.meaning : "SHOW HINT"}
                </Typography>
              </Box>
            )}
          </>
        ) : (
          <Box
            sx={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "background.paper",
              gap: 1,
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: "text.secondary", letterSpacing: "0.1em" }}
            >
              WHAT WORD MATCHES?
            </Typography>
            {showHint && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontStyle: "italic" }}
              >
                {card.meaning}
              </Typography>
            )}
            {!showHint && (
              <Button
                size="small"
                variant="text"
                onClick={() => setShowHint(true)}
                sx={{ fontSize: "0.7rem", color: "primary.main" }}
              >
                Show Hint
              </Button>
            )}
          </Box>
        )}
      </Box>

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
            sx={{
              bgcolor: "primary.main",
              color: "#0F0E0C",
              "&:hover": { bgcolor: "primary.light" },
              flexShrink: 0,
            }}
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

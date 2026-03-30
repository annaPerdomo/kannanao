"use client";
import { useState, useCallback } from "react";
import {
  Box,
  Typography,
  IconButton,
  Button,
  LinearProgress,
  Chip,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

import { Flashcard } from "@/components/Flashcard";
import { Loading } from "@/components/Loading";
import { SectionHeader } from "@/components/SectionHeader";
import { useCards } from "@/hooks/useCards";
import { useDecks } from "@/hooks/useDecks";

interface StudyProps {
  deckId: string;
  onBack: () => void;
}

// Must match the Flashcard flip transition duration (0.6s) — wait for it to
// finish before swapping the card so the back face never flashes.
const FLIP_DURATION_MS = 620;

export default function Study({ deckId, onBack }: StudyProps) {
  const { cards, loading: cardsLoading } = useCards(deckId);
  const { decks, loading: decksLoading } = useDecks();
  const [index, setIndex] = useState(0);
  const [navigating, setNavigating] = useState(false);

  const card = cards[index];
  const deck = decks.find((d) => d.id === deckId);
  const deckName = deck ? deck.name : "Deck";

  // Flip the card back to front, then after the animation completes, advance.
  // `navigating` blocks further clicks mid-transition.
  const navigate = useCallback(
    (direction: 1 | -1) => {
      if (navigating) return;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= cards.length) return;

      setNavigating(true);
      setTimeout(() => {
        setIndex(nextIndex);
        setNavigating(false);
      }, FLIP_DURATION_MS);
    },
    [navigating, index, cards.length]
  );

  if (cardsLoading || decksLoading) {
    return (
      <Box sx={{ maxWidth: 800, mx: "auto", px: { xs: 2, sm: 4 }, py: 6 }}>
        <Loading message="Loading your decks…" />
      </Box>
    );
  }

  if (cards.length === 0) {
    return (
      <Box sx={{ maxWidth: 800, mx: "auto", px: { xs: 2, sm: 4 }, py: 6, textAlign: "center" }}>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack}>
          Back to Deck
        </Button>
        <Typography color="text.secondary" sx={{ mt: 3 }}>
          No cards in this deck yet.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        maxWidth: 800,
        mx: "auto",
        px: { xs: 2, sm: 4 },
        py: 4,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header — same container as Practice page */}
      <SectionHeader
        title={deckName}
        onBack={onBack}
        badge={`${cards.length} cards`}
      />

      {/* Progress bar */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <LinearProgress
          variant="determinate"
          value={((index + 1) / cards.length) * 100}
          sx={{
            flexGrow: 1,
            height: 6,
            borderRadius: 99,
            bgcolor: "rgba(249,168,212,0.18)",
            "& .MuiLinearProgress-bar": {
              borderRadius: 99,
              background: "linear-gradient(90deg, #FBCFE8 0%, #F472B6 50%, #C4B5FD 100%)",
            },
          }}
        />
        <Chip
          label={`${index + 1} / ${cards.length}`}
          size="small"
          sx={{
            bgcolor: "rgba(249,168,212,0.18)",
            color: "#BE185D",
            fontWeight: 600,
            border: "1px solid rgba(249,168,212,0.4)",
          }}
        />
      </Box>

      {/* Card — fills the constrained column */}
      <Box sx={{ width: "100%" }}>
        {card && <Flashcard card={card} width="100%" height={420} />}
      </Box>

      {/* Navigation */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          mt: 3,
        }}
      >
        <IconButton
          onClick={() => navigate(-1)}
          disabled={index === 0 || navigating}
          sx={{
            border: "1px solid rgba(249,168,212,0.45)",
            bgcolor: "#FFF3F9",
            "&:not(:disabled):hover": { borderColor: "#EC4899" },
          }}
        >
          <ArrowBackIcon />
        </IconButton>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ letterSpacing: "0.08em" }}
        >
          TAP CARD TO FLIP
        </Typography>

        <IconButton
          onClick={() => navigate(1)}
          disabled={index === cards.length - 1 || navigating}
          sx={{
            border: "1px solid rgba(249,168,212,0.45)",
            bgcolor: "#FFF3F9",
            "&:not(:disabled):hover": { borderColor: "#EC4899" },
          }}
        >
          <ArrowForwardIcon />
        </IconButton>
      </Box>

      {index === cards.length - 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Button variant="outlined" onClick={onBack}>
            Finish Session
          </Button>
        </Box>
      )}
    </Box>
  );
}
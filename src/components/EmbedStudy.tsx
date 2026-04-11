"use client";
import { useState, useCallback, useEffect, useMemo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Chip from "@mui/material/Chip";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { Flashcard } from "@/components/Flashcard";
import { Loading } from "@/components/Loading";
import { dbCardToApp } from "@/lib/supabase";
import type { Flashcard as FlashcardType } from "@/types/flashcard";

interface EmbedStudyProps {
  deckId: string;
}

const SLIDE_DURATION_MS = 260;
const CARD_W = 320;
const CARD_H = 452;

const CONFETTI_COLORS = [
  "#F472B6", "#C4B5FD", "#FCD34D", "#67E8F9",
  "#6EE7B7", "#FB923C", "#A78BFA", "#F9A8D4",
];

const SPARKLE_ITEMS = [
  { emoji: "✨", left: 10, delay: 0.04 },
  { emoji: "⭐", left: 24, delay: 0 },
  { emoji: "💫", left: 40, delay: 0.10 },
  { emoji: "✨", left: 57, delay: 0.06 },
  { emoji: "🌟", left: 72, delay: 0.02 },
  { emoji: "⭐", left: 87, delay: 0.12 },
];

function CelebrationOverlay({ cardCount, onReset }: { cardCount: number; onReset: () => void }) {
  useEffect(() => {
    const t = setTimeout(onReset, 3600);
    return () => clearTimeout(t);
  }, [onReset]);

  const pieces = useMemo(() =>
    Array.from({ length: 28 }, (_, i) => ({
      id: i,
      left: `${((i / 28) * 100 + Math.sin(i * 1.9) * 7 + 50) % 100}%`,
      delay: `${(i * 0.11) % 2}s`,
      duration: `${1.8 + (i % 5) * 0.28}s`,
      size: `${9 + (i % 4) * 4}px`,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      round: i % 3 !== 1,
    })), []);

  return (
    <Box
      onClick={onReset}
      sx={{
        position: "fixed", inset: 0, zIndex: 9999,
        bgcolor: "rgba(10,5,20,0.72)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer",
        animation: "celebFade 3.6s ease forwards",
        "@keyframes celebFade": {
          "0%": { opacity: 0 }, "8%": { opacity: 1 },
          "78%": { opacity: 1 }, "100%": { opacity: 0 },
        },
      }}
    >
      {pieces.map((p) => (
        <Box key={p.id} sx={{
          position: "absolute", left: p.left, top: "-24px",
          width: p.size, height: p.size, bgcolor: p.color,
          borderRadius: p.round ? "50%" : "2px",
          animation: `confettiFall ${p.duration} ${p.delay} ease-in both`,
          "@keyframes confettiFall": {
            from: { transform: "translateY(0) rotate(0deg)", opacity: 1 },
            to: { transform: "translateY(110vh) rotate(600deg)", opacity: 0.2 },
          },
        }} />
      ))}
      <Box sx={{
        textAlign: "center", px: 4, py: 3, borderRadius: "28px",
        background: "rgba(255,255,255,0.1)", backdropFilter: "blur(16px)",
        border: "1.5px solid rgba(255,255,255,0.22)",
        animation: "celebPop 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards",
        "@keyframes celebPop": {
          from: { transform: "scale(0.25) translateY(40px)", opacity: 0 },
          to: { transform: "scale(1) translateY(0)", opacity: 1 },
        },
      }}>
        <Box sx={{ fontSize: "4rem", lineHeight: 1 }}>🌸</Box>
        <Typography sx={{ mt: 1.5, fontSize: "1.7rem", fontWeight: 900, color: "#fff", fontFamily: '"Nunito",sans-serif' }}>
          すごい！
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: "0.95rem", color: "rgba(255,255,255,0.88)", fontFamily: '"Nunito",sans-serif' }}>
          You reviewed all <b>{cardCount}</b> cards!
        </Typography>
        <Typography sx={{ mt: 2, fontSize: "0.68rem", color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em", fontFamily: '"DM Mono",monospace' }}>
          TAP TO REVIEW AGAIN
        </Typography>
      </Box>
    </Box>
  );
}

export default function EmbedStudy({ deckId }: EmbedStudyProps) {
  const [cards, setCards] = useState<FlashcardType[]>([]);
  const [deckName, setDeckName] = useState("Flashcards");
  const [deckEmoji, setDeckEmoji] = useState("🌸");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [navigating, setNavigating] = useState(false);
  const [navDir, setNavDir] = useState<1 | -1>(1);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    fetch(`/api/public/deck/${deckId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setDeckName(data.deck.name);
        setDeckEmoji(data.deck.emoji ?? "🌸");
        setCards(data.cards.map(dbCardToApp));
      })
      .catch(() => setError("Failed to load deck"))
      .finally(() => setLoading(false));
  }, [deckId]);

  const navigate = useCallback(
    (direction: 1 | -1) => {
      if (navigating) return;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= cards.length) return;
      setNavDir(direction);
      setNavigating(true);
      setTimeout(() => {
        setIndex(nextIndex);
        setNavigating(false);
      }, SLIDE_DURATION_MS);
    },
    [navigating, index, cards.length],
  );

  const handleReset = useCallback(() => {
    setShowCelebration(false);
    setIndex(0);
  }, []);

  if (loading) return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
      <Loading message="Loading cards…" />
    </Box>
  );

  if (error) return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, p: 4 }}>
      <Typography color="text.secondary" sx={{ fontSize: "0.9rem" }}>
        This deck is not available for embedding.
      </Typography>
    </Box>
  );

  if (cards.length === 0) return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, p: 4 }}>
      <Typography color="text.secondary" sx={{ fontSize: "0.9rem" }}>No cards in this deck yet.</Typography>
    </Box>
  );

  const card = cards[index];

  return (
    <Box sx={{
      display: "flex", flexDirection: "column", alignItems: "center",
      px: 2, py: 3, minHeight: "100dvh",
    }}>
      {/* Deck title */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, alignSelf: "flex-start", pl: 1 }}>
        <Typography sx={{ fontSize: "1.1rem" }}>{deckEmoji}</Typography>
        <Typography sx={{
          fontFamily: '"Nunito",sans-serif', fontWeight: 800, fontSize: "1rem",
          color: "text.primary", lineHeight: 1,
        }}>
          {deckName}
        </Typography>
      </Box>

      {/* Progress bar */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3, width: "100%", maxWidth: CARD_W }}>
        <LinearProgress
          variant="determinate"
          value={((index + 1) / cards.length) * 100}
          sx={{
            flexGrow: 1, height: 6, borderRadius: 99,
            bgcolor: "rgba(249,168,212,0.18)",
            "& .MuiLinearProgress-bar": {
              borderRadius: 99,
              background: "linear-gradient(90deg,#FBCFE8 0%,#F472B6 50%,#C4B5FD 100%)",
            },
          }}
        />
        <Chip
          label={`${index + 1} / ${cards.length}`}
          size="small"
          sx={{
            bgcolor: "rgba(249,168,212,0.18)", color: "#BE185D",
            fontWeight: 600, border: "1px solid rgba(249,168,212,0.4)",
          }}
        />
      </Box>

      {/* Card */}
      <Box sx={{ display: "flex", justifyContent: "center", perspective: "1000px", position: "relative" }}>
        <Box
          key={index}
          sx={{
            width: CARD_W, height: CARD_H, flexShrink: 0,
            position: "relative", transformOrigin: "top center",
            "@keyframes dealIn": {
              "0%": { transform: "translateY(-90px) rotateX(-42deg) rotateZ(4deg) scale(0.82)", opacity: 0 },
              "55%": { opacity: 1 },
              "100%": { transform: "translateY(0) rotateX(0deg) rotateZ(0deg) scale(1)", opacity: 1 },
            },
            "@keyframes dealInBack": {
              "0%": { transform: "translateY(-90px) rotateX(-42deg) rotateZ(-4deg) scale(0.82)", opacity: 0 },
              "55%": { opacity: 1 },
              "100%": { transform: "translateY(0) rotateX(0deg) rotateZ(0deg) scale(1)", opacity: 1 },
            },
            "@keyframes sparkleUp": {
              from: { transform: "translateY(0) scale(1)", opacity: 0.9 },
              to: { transform: "translateY(-64px) scale(0)", opacity: 0 },
            },
            ...(navigating
              ? {
                  transform: "translateY(28px) rotateX(12deg) scale(0.91)",
                  opacity: 0,
                  transition: `transform ${SLIDE_DURATION_MS}ms ease-in, opacity ${SLIDE_DURATION_MS}ms ease-in`,
                  pointerEvents: "none",
                }
              : {
                  animation: `${navDir === 1 ? "dealIn" : "dealInBack"} 0.48s cubic-bezier(0.22,1,0.36,1)`,
                }),
          }}
        >
          {card && <Flashcard card={card} width={CARD_W} height={CARD_H} />}
          {!navigating && SPARKLE_ITEMS.map((s, i) => (
            <Box key={i} sx={{
              position: "absolute", bottom: 16, left: `${s.left}%`,
              fontSize: "1rem", pointerEvents: "none",
              animation: `sparkleUp 0.72s ${s.delay}s ease-out both`,
            }}>
              {s.emoji}
            </Box>
          ))}
        </Box>
      </Box>

      {/* Navigation */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, mt: 3 }}>
        <IconButton
          onClick={() => navigate(-1)}
          disabled={index === 0 || navigating}
          sx={{
            border: "1px solid rgba(249,168,212,0.45)", bgcolor: "#FFF3F9",
            "&:not(:disabled):hover": { borderColor: "#EC4899" },
          }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: "0.08em" }}>
          TAP CARD TO FLIP
        </Typography>
        <IconButton
          onClick={() => index === cards.length - 1 ? setShowCelebration(true) : navigate(1)}
          disabled={navigating}
          sx={{
            border: "1px solid rgba(249,168,212,0.45)", bgcolor: "#FFF3F9",
            "&:not(:disabled):hover": { borderColor: "#EC4899" },
          }}
        >
          <ArrowForwardIcon />
        </IconButton>
      </Box>

      {/* Branding */}
      <Box sx={{ mt: "auto", pt: 3, pb: 1, display: "flex", alignItems: "center", gap: 0.5 }}>
        <Typography sx={{ fontSize: "0.65rem", color: "text.disabled", fontFamily: '"DM Mono",monospace', letterSpacing: "0.06em" }}>
          Powered by
        </Typography>
        <Typography
          component="a"
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            fontSize: "0.65rem", color: "primary.main", fontFamily: '"DM Mono",monospace',
            letterSpacing: "0.06em", textDecoration: "none", fontWeight: 700,
            "&:hover": { textDecoration: "underline" },
          }}
        >
          Kannanao 🌸
        </Typography>
      </Box>

      {showCelebration && (
        <CelebrationOverlay cardCount={cards.length} onReset={handleReset} />
      )}
    </Box>
  );
}

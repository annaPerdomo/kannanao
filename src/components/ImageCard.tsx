"use client";
import { useState } from "react";
import { Box, Typography, IconButton, Tooltip } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import type { Flashcard } from "@/types/flashcard";
import { EditCardDialog } from "@/components/EditCardDialog";
import { getFlashcardDisplayText, cardXp } from "@/lib/flashcardUtils";
import FuriganaText, { stripFurigana } from "@/components/FuriganaText";
import { SpeakButton } from "@/components/SpeakButton";

interface ImageCardProps {
  card: Flashcard;
  onDelete: (id: string) => void;
  onUpdate?: (id: string, patch: Partial<Flashcard>) => Promise<Flashcard | null>;
}



export function ImageCard({ card, onDelete, onUpdate }: ImageCardProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const CARD_FRAME = `linear-gradient(145deg, ${brand[100]} 0%, ${brand[300]} 25%, ${brand[50]} 50%, ${brand[400]} 75%, ${brand[100]} 100%)`;
  const [editOpen, setEditOpen] = useState(false);
  const [localCard, setLocalCard] = useState<Flashcard>(card);

  const { titleText, subtitleText } = getFlashcardDisplayText(localCard);
  const handleSave = (updated: Flashcard) => { setLocalCard(updated); onUpdate?.(updated.id, updated); };

  const isKanji = localCard.mainViewMode === "kanji";
  const isPhrase = localCard.cardType === "phrase";
  const typeGradient = isKanji
    ? `linear-gradient(135deg, ${accent[400]} 0%, ${accent[600]} 100%)`
    : `linear-gradient(135deg, ${brand[400]} 0%, ${brand[600]} 100%)`;
  const typeBg = isKanji ? accent[50] : brand[50];
  const typeAccent = isKanji ? accent[500] : brand[500];

  return (
    <>
      <Box
        sx={{
          position: "relative",
          background: CARD_FRAME,
          borderRadius: "14px",
          p: "5px",
          boxShadow: `0 6px 24px rgba(0,0,0,0.16), 0 2px 8px ${alpha(brand[400], 0.28)}`,
          transition: "transform 0.25s cubic-bezier(.34,1.56,.64,1), box-shadow 0.25s ease",
          "&:hover": {
            transform: "translateY(-6px) rotate(-0.5deg)",
            boxShadow: `0 16px 40px rgba(0,0,0,0.24), 0 4px 12px ${alpha(brand[400], 0.38)}`,
            "& .holo-sheen": { opacity: 1 },
            "& .card-actions": { opacity: 1 },
          },
        }}
      >
        {/* Holographic rainbow sheen on hover */}
        <Box
          className="holo-sheen"
          sx={{
            position: "absolute", inset: 0, borderRadius: "14px",
            background: "linear-gradient(115deg, transparent 0%, rgba(255,50,180,0.18) 20%, rgba(255,220,50,0.18) 35%, rgba(50,255,150,0.18) 50%, rgba(50,150,255,0.18) 65%, rgba(180,50,255,0.18) 80%, transparent 100%)",
            opacity: 0, transition: "opacity 0.35s ease",
            pointerEvents: "none", zIndex: 5, mixBlendMode: "screen",
          }}
        />

        {/* Inner card */}
        <Box
          sx={{
            bgcolor: brand[50],
            borderRadius: "10px",
            overflow: "hidden",
            display: "flex", flexDirection: "column",
            border: "2px solid rgba(255,255,255,0.88)",
          }}
        >
          {/* Top bar: type label + XP */}
          <Box
            sx={{
              px: 1.5, py: 0.75,
              background: typeGradient,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}
          >
            <Box sx={{ display: "flex", gap: 0.7, alignItems: "center" }}>
              <Typography sx={{ fontSize: "0.6rem", fontWeight: 900, color: "white", textTransform: "uppercase", letterSpacing: "0.07em", textShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>
                {isKanji ? "漢字" : "かな"}
              </Typography>
              <Box sx={{ width: "1px", height: 9, bgcolor: "rgba(255,255,255,0.35)" }} />
              <Typography sx={{ fontSize: "0.6rem", fontWeight: 800, color: "rgba(255,255,255,0.9)", textTransform: "uppercase", letterSpacing: "0.04em", textShadow: "0 1px 3px rgba(0,0,0,0.2)" }}>
                {isPhrase ? "フレーズ" : "単語"}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "baseline", gap: "2px" }}>
              <Typography sx={{ fontSize: "0.5rem", fontWeight: 700, color: "rgba(255,255,255,0.8)", lineHeight: 1 }}>XP</Typography>
              <Typography sx={{ fontSize: "0.68rem", fontWeight: 900, color: "white", textShadow: "0 1px 3px rgba(0,0,0,0.3)", lineHeight: 1 }}>
                {cardXp(localCard.jlptLevel)}
              </Typography>
            </Box>
          </Box>

          {/* Art frame */}
          <Box
            sx={{
              mx: "8px", mt: "6px",
              borderRadius: "6px", overflow: "hidden",
              border: "2px solid rgba(0,0,0,0.14)",
              boxShadow: "inset 0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            {localCard.imageUrl ? (
              <Box
                component="img" src={localCard.imageUrl} alt={localCard.word}
                sx={{ width: "100%", height: 185, objectFit: "cover", display: "block" }}
              />
            ) : (
              <Box
                sx={{
                  width: "100%", height: 185,
                  background: `linear-gradient(135deg, ${brand[100]} 0%, ${accent[100]} 50%, ${brand[100]} 100%)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <Typography sx={{ fontSize: "3.5rem" }}>🌸</Typography>
              </Box>
            )}
          </Box>

          {/* Card name */}
          <Box sx={{ px: 1.5, pt: "9px", pb: "7px", borderBottom: `2px solid ${typeAccent}` }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Typography
                sx={{
                  fontSize: "1.05rem", fontWeight: 900, color: "#111",
                  lineHeight: 1.15, fontFamily: '"Nunito", sans-serif', letterSpacing: "-0.01em",
                }}
              >
                {titleText}
              </Typography>
              <SpeakButton text={titleText} iconSize="0.85rem" />
            </Box>
            {subtitleText && (
              <Typography sx={{ fontSize: "0.65rem", color: "#777", fontFamily: '"Nunito", sans-serif', fontStyle: "italic", lineHeight: 1.3, mt: "2px" }}>
                {subtitleText}
              </Typography>
            )}
          </Box>

          {/* Meaning as "ability" */}
          <Box sx={{ px: 1.5, pt: "8px" }}>
            <Box
              sx={{
                bgcolor: alpha(typeBg, 0.75),
                borderRadius: "6px", px: 1.2, py: "7px",
                border: `1px solid ${alpha(typeAccent, 0.22)}`,
              }}
            >
              <Typography sx={{ fontSize: "0.54rem", fontWeight: 900, color: typeAccent, letterSpacing: "0.12em", textTransform: "uppercase", mb: "3px", fontFamily: '"DM Mono", monospace' }}>
                ★ Meaning
              </Typography>
              <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: "#1A1A1A", fontFamily: '"Nunito", sans-serif', lineHeight: 1.3 }}>
                {localCard.meaning}
              </Typography>
            </Box>
          </Box>

          {/* Example sentence as "attack" */}
          {localCard.example_jp && (
            <Box sx={{ px: 1.5, pt: "6px" }}>
              <Box
                sx={{
                  bgcolor: alpha(typeBg, 0.75),
                  borderRadius: "6px", px: 1.2, py: "7px",
                  border: `1px solid ${alpha(typeAccent, 0.22)}`,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: "3px" }}>
                  <Typography sx={{ fontSize: "0.54rem", fontWeight: 900, color: typeAccent, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: '"DM Mono", monospace' }}>
                    * SAMPLE SENTENCE
                  </Typography>
                  <SpeakButton text={stripFurigana(localCard.example_jp)} iconSize="0.75rem" />
                </Box>
                <Typography component="div" sx={{ fontSize: "0.85rem", color: accent[700], fontFamily: '"Nunito", sans-serif', lineHeight: 1.6, fontWeight: 600 }}>
                  <FuriganaText text={localCard.example_jp} showFurigana={localCard.mainViewMode === "hiragana"} />
                </Typography>
                {localCard.example_en && (
                  <Typography sx={{ fontSize: "0.78rem", color: "#555", mt: "4px", fontStyle: "italic", lineHeight: 1.5 }}>
                    {localCard.example_en}
                  </Typography>
                )}
              </Box>
            </Box>
          )}

          {/* Card footer */}
          <Box
            sx={{
              mt: "auto", px: 1.5, py: "8px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              borderTop: `1px solid ${alpha(brand[300], 0.25)}`,
            }}
          >
            {localCard.jlptLevel && (
              <Typography sx={{ fontSize: "0.52rem", color: alpha(brand[600], 0.7), fontFamily: '"DM Mono", monospace', letterSpacing: "0.06em" }}>
                JLPT {localCard.jlptLevel}
              </Typography>
            )}
            <Typography sx={{ fontSize: "0.52rem", color: alpha(brand[500], 0.5), fontFamily: '"DM Mono", monospace' }}>★</Typography>
          </Box>
        </Box>

        {/* Action buttons */}
        <Box
          className="card-actions"
          sx={{ position: "absolute", top: 46, right: 10, display: "flex", flexDirection: "column", gap: 0.5, opacity: 0, transition: "opacity 0.15s ease", zIndex: 10 }}
        >
          <Tooltip title="Edit card">
            <IconButton size="small" onClick={() => setEditOpen(true)}
              sx={{
                width: 26, height: 26, bgcolor: "rgba(255,255,255,0.95)", backdropFilter: "blur(6px)",
                border: `1px solid ${alpha(brand[300], 0.5)}`, color: brand[700],
                "&:hover": { bgcolor: brand[50] },
              }}
            >
              <EditIcon sx={{ fontSize: 13 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete card">
            <IconButton size="small" onClick={() => onDelete(localCard.id)}
              sx={{
                width: 26, height: 26, bgcolor: "rgba(255,255,255,0.95)", backdropFilter: "blur(6px)",
                border: `1px solid ${alpha(brand[300], 0.5)}`, color: brand[700],
                "&:hover": { bgcolor: brand[50], color: "#DC2626" },
              }}
            >
              <DeleteOutlineIcon sx={{ fontSize: 13 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <EditCardDialog card={localCard} open={editOpen} onClose={() => setEditOpen(false)} onSave={handleSave} />
    </>
  );
}

"use client";
import { useState } from "react";
import { Box, Typography, IconButton, Tooltip } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import type { Flashcard } from "@/types/flashcard";
import { EditCardDialog } from "@/components/EditCardDialog";
import { getFlashcardDisplayText } from "@/lib/flashcardUtils";
import FuriganaText from "@/components/FuriganaText";

interface ImageCardProps {
  card: Flashcard;
  onDelete: (id: string) => void;
  onUpdate?: (id: string, patch: Partial<Flashcard>) => Promise<Flashcard | null>;
  compact?: boolean;
}

export function ImageCard({ card, onDelete, onUpdate, compact = false }: ImageCardProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;

  const [editOpen, setEditOpen] = useState(false);
  const [localCard, setLocalCard] = useState<Flashcard>(card);

  const { titleText, subtitleText } = getFlashcardDisplayText(localCard);
  const handleSave = (updated: Flashcard) => { setLocalCard(updated); onUpdate?.(updated.id, updated); };
  const isKanji = localCard.mainViewMode === "kanji";

  return (
    <>
      <Box sx={{
        position: "relative", borderRadius: "18px", overflow: "hidden",
        border: `1.5px solid ${alpha(brand[300], 0.35)}`,
        bgcolor: "#FFFFFF",
        boxShadow: `0 2px 12px ${alpha(brand[300], 0.13)}`,
        display: "flex", flexDirection: "column",
        transition: "box-shadow 0.2s ease, transform 0.2s ease",
        "&:hover": {
          boxShadow: `0 8px 28px ${alpha(brand[300], 0.28)}`,
          transform: "translateY(-3px)",
          "& .card-actions": { opacity: 1 },
        },
      }}>
        {/* Image */}
        {localCard.imageUrl ? (
          <Box component="img" src={localCard.imageUrl} alt={localCard.word}
            sx={{ width: "100%", height: 160, objectFit: "cover", display: "block", bgcolor: brand[50] }} />
        ) : (
          <Box sx={{
            width: "100%", height: 160, display: "flex", alignItems: "center", justifyContent: "center",
            background: `linear-gradient(135deg, ${brand[50]} 0%, ${accent[50]} 100%)`,
          }}>
            <Typography sx={{ fontSize: "2.5rem" }}>🌸</Typography>
          </Box>
        )}

        {/* Mode badge (top-left) */}
        <Box sx={{ position: "absolute", top: 10, left: 10, display: "flex", gap: 0.6 }}>
          <Box sx={{
            px: 1.1, py: "3px", borderRadius: "20px", backdropFilter: "blur(6px)",
            background: isKanji ? alpha(accent[100], 0.92) : alpha(brand[100], 0.92),
            border: "1.5px solid", borderColor: isKanji ? alpha(accent[300], 0.7) : alpha(brand[300], 0.7),
          }}>
            <Typography sx={{ fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.03em", color: isKanji ? accent[700] : brand[700], fontFamily: '"Nunito", sans-serif', lineHeight: 1 }}>
              {isKanji ? "漢字" : "ひらがな"}
            </Typography>
          </Box>

          <Box sx={{
            px: 1.1, py: "3px", borderRadius: "20px", backdropFilter: "blur(6px)",
            background: localCard.cardType === "phrase" ? "rgba(209,250,229,0.92)" : "rgba(254,243,199,0.92)",
            border: "1.5px solid", borderColor: localCard.cardType === "phrase" ? "rgba(110,231,183,0.7)" : "rgba(252,211,77,0.7)",
          }}>
            <Typography sx={{ fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.03em", color: localCard.cardType === "phrase" ? "#065F46" : "#92400E", fontFamily: '"Nunito", sans-serif', lineHeight: 1 }}>
              {localCard.cardType === "phrase" ? "フレーズ" : "単語"}
            </Typography>
          </Box>
        </Box>

        {/* Action buttons (top-right) */}
        <Box className="card-actions" sx={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 0.5, opacity: 0, transition: "opacity 0.15s ease" }}>
          <Tooltip title="Edit card">
            <IconButton size="small" onClick={() => setEditOpen(true)} sx={{
              width: 28, height: 28, bgcolor: "rgba(255,255,255,0.92)", backdropFilter: "blur(6px)",
              border: `1px solid ${alpha(brand[300], 0.5)}`, color: brand[700],
              "&:hover": { bgcolor: brand[50] },
            }}>
              <EditIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete card">
            <IconButton size="small" onClick={() => onDelete(localCard.id)} sx={{
              width: 28, height: 28, bgcolor: "rgba(255,255,255,0.92)", backdropFilter: "blur(6px)",
              border: `1px solid ${alpha(brand[300], 0.5)}`, color: brand[700],
              "&:hover": { bgcolor: brand[50], color: "#DC2626" },
            }}>
              <DeleteOutlineIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Card body */}
        <Box sx={{ p: "14px 14px 16px", display: "flex", flexDirection: "column", gap: 1 }}>
          <Box>
            <Typography sx={{ fontSize: "1.35rem", fontWeight: 800, color: brand[800], lineHeight: 1.2, fontFamily: '"Nunito", sans-serif' }}>
              {titleText}
            </Typography>
            {subtitleText && (
              <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", fontFamily: '"Nunito", sans-serif', mt: 0.2 }}>
                {subtitleText}
              </Typography>
            )}
          </Box>

          {!compact && (
            <Typography sx={{ fontSize: "0.88rem", fontWeight: 700, color: "text.primary", fontFamily: '"Nunito", sans-serif' }}>
              {localCard.meaning}
            </Typography>
          )}

          {!compact && localCard.example_jp && (
            <Box sx={{ bgcolor: brand[50], borderRadius: "10px", px: 1.4, pt: "7px", pb: "9px", borderLeft: `3px solid ${alpha(brand[400], 0.6)}` }}>
              <Typography sx={{ fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: brand[400], fontFamily: '"Nunito", sans-serif', mb: 0.4 }}>
                例文 · Example
              </Typography>
              <Typography component="div" sx={{ fontSize: "0.78rem", color: accent[700], fontFamily: '"Nunito", sans-serif', lineHeight: 1.55, fontWeight: 600 }}>
                <FuriganaText text={localCard.example_jp} showFurigana={localCard.mainViewMode === 'hiragana'} />
              </Typography>
              {localCard.example_en && (
                <Typography sx={{ fontSize: "0.72rem", color: accent[700], fontFamily: '"Nunito", sans-serif', lineHeight: 1.45, mt: 0.35, fontStyle: "italic" }}>
                  {localCard.example_en}
                </Typography>
              )}
            </Box>
          )}

          {compact && (
            <Typography sx={{ fontSize: "0.68rem", color: alpha(brand[700], 0.45), fontFamily: '"Nunito", sans-serif', fontStyle: "italic" }}>
              Practice to reveal
            </Typography>
          )}
        </Box>
      </Box>

      <EditCardDialog card={localCard} open={editOpen} onClose={() => setEditOpen(false)} onSave={handleSave} />
    </>
  );
}

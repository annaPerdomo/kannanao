"use client";

import { useState } from "react";
import { Box, Typography, IconButton, Tooltip } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import type { Flashcard } from "@/types/flashcard";
import { EditCardDialog } from "@/components/EditCardDialog";
import { getFlashcardDisplayText } from "@/lib/flashcardUtils";

interface ImageCardProps {
  card: Flashcard;
  onDelete: (id: string) => void;
  onUpdate?: (
    id: string,
    patch: Partial<Flashcard>,
  ) => Promise<Flashcard | null>;
}

export function ImageCard({ card, onDelete, onUpdate }: ImageCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [localCard, setLocalCard] = useState<Flashcard>(card);

  const { titleText, subtitleText } = getFlashcardDisplayText(localCard);

  const handleSave = (updated: Flashcard) => {
    setLocalCard(updated);
    onUpdate?.(updated.id, updated);
  };

  const isKanji = localCard.mainViewMode === "kanji";

  return (
    <>
      <Box
        sx={{
          position: "relative",
          borderRadius: "18px",
          overflow: "hidden",
          border: "1.5px solid rgba(249,168,212,0.35)",
          bgcolor: "#FFFFFF",
          boxShadow: "0 2px 12px rgba(249,168,212,0.13)",
          display: "flex",
          flexDirection: "column",
          transition: "box-shadow 0.2s ease, transform 0.2s ease",
          "&:hover": {
            boxShadow: "0 8px 28px rgba(249,168,212,0.28)",
            transform: "translateY(-3px)",
            "& .card-actions": { opacity: 1 },
          },
        }}
      >
        {/* ── Image ── */}
        {localCard.imageUrl ? (
          <Box
            component="img"
            src={localCard.imageUrl}
            alt={localCard.word}
            sx={{
              width: "100%",
              height: 160,
              objectFit: "cover",
              display: "block",
              bgcolor: "#FFF0F8",
            }}
          />
        ) : (
          <Box
            sx={{
              width: "100%",
              height: 160,
              background: "linear-gradient(135deg, #FFF0F8 0%, #FAF5FF 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography sx={{ fontSize: "2.5rem" }}>🌸</Typography>
          </Box>
        )}

        {/* ── Mode badge (top-left, over image) ── */}
        <Box
          sx={{
            position: "absolute",
            top: 10,
            left: 10,
            px: 1.1,
            py: "3px",
            borderRadius: "20px",
            backdropFilter: "blur(6px)",
            background: isKanji
              ? "rgba(237,233,254,0.92)"
              : "rgba(252,231,243,0.92)",
            border: "1.5px solid",
            borderColor: isKanji
              ? "rgba(196,181,253,0.7)"
              : "rgba(249,168,212,0.7)",
            display: "flex",
            alignItems: "center",
            gap: 0.5,
          }}
        >
          <Typography
            sx={{
              fontSize: "0.68rem",
              fontWeight: 800,
              letterSpacing: "0.03em",
              color: isKanji ? "#6D28D9" : "#BE185D",
              fontFamily: '"Nunito", sans-serif',
              lineHeight: 1,
            }}
          >
            {isKanji ? "漢字" : "ひらがな"}
          </Typography>
        </Box>

        {/* ── Action buttons (top-right, over image) ── */}
        <Box
          className="card-actions"
          sx={{
            position: "absolute",
            top: 10,
            right: 10,
            display: "flex",
            gap: 0.5,
            opacity: 0,
            transition: "opacity 0.15s ease",
          }}
        >
          <Tooltip title="Edit card">
            <IconButton
              size="small"
              onClick={() => setEditOpen(true)}
              sx={{
                width: 28,
                height: 28,
                bgcolor: "rgba(255,255,255,0.92)",
                backdropFilter: "blur(6px)",
                border: "1px solid rgba(249,168,212,0.5)",
                color: "#BE185D",
                "&:hover": { bgcolor: "#FFF0F8" },
              }}
            >
              <EditIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Delete card">
            <IconButton
              size="small"
              onClick={() => onDelete(localCard.id)}
              sx={{
                width: 28,
                height: 28,
                bgcolor: "rgba(255,255,255,0.92)",
                backdropFilter: "blur(6px)",
                border: "1px solid rgba(249,168,212,0.5)",
                color: "#BE185D",
                "&:hover": { bgcolor: "#FFF0F8", color: "#DC2626" },
              }}
            >
              <DeleteOutlineIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* ── Card body ── */}
        <Box sx={{ p: "14px 14px 16px", display: "flex", flexDirection: "column", gap: 1 }}>
          {/* Word + reading */}
          <Box>
            <Typography
              sx={{
                fontSize: "1.35rem",
                fontWeight: 800,
                color: "#9D174D",
                lineHeight: 1.2,
                fontFamily: '"Nunito", sans-serif',
              }}
            >
              {titleText}
            </Typography>
            {subtitleText && (
              <Typography
                sx={{
                  fontSize: "0.75rem",
                  color: "#C2709A",
                  fontFamily: '"Nunito", sans-serif',
                  mt: 0.2,
                }}
              >
                {subtitleText}
              </Typography>
            )}
          </Box>

          {/* Meaning */}
          <Typography
            sx={{
              fontSize: "0.88rem",
              fontWeight: 700,
              color: "#1F2937",
              fontFamily: '"Nunito", sans-serif',
            }}
          >
            {localCard.meaning}
          </Typography>

          {/* Example sentence block */}
          {localCard.example_jp && (
            <Box
              sx={{
                bgcolor: "#FFF0F8",
                borderRadius: "10px",
                px: 1.4,
                pt: "7px",
                pb: "9px",
                borderLeft: "3px solid rgba(244,114,182,0.6)",
              }}
            >
              {/* Label */}
              <Typography
                sx={{
                  fontSize: "0.6rem",
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#F472B6",
                  fontFamily: '"Nunito", sans-serif',
                  mb: 0.4,
                }}
              >
                例文 · Example
              </Typography>

              {/* Japanese sentence */}
              <Typography
                sx={{
                  fontSize: "0.78rem",
                  color: "#6B21A8",
                  fontFamily: '"Nunito", sans-serif',
                  lineHeight: 1.55,
                  fontWeight: 600,
                }}
              >
                {localCard.example_jp}
              </Typography>

              {/* English translation */}
              {localCard.example_en && (
                <Typography
                  sx={{
                    fontSize: "0.72rem",
                    color: "#6B21A8",
                    fontFamily: '"Nunito", sans-serif',
                    lineHeight: 1.45,
                    mt: 0.35,
                    fontStyle: "italic",
                  }}
                >
                  {localCard.example_en}
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </Box>

      <EditCardDialog
        card={localCard}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={handleSave}
      />
    </>
  );
}
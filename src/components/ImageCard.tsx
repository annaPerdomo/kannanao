"use client";

import { useState } from "react";
import { Box, Chip, Typography, IconButton, Tooltip } from "@mui/material";
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

  return (
    <>
      <Box
        sx={{
          position: "relative",
          borderRadius: "14px",
          overflow: "hidden",
          border: "1.5px solid rgba(249,168,212,0.32)",
          bgcolor: "#FFFFFF",
          boxShadow: "0 2px 10px rgba(249,168,212,0.1)",
          display: "flex",
          flexDirection: "column",
          transition: "box-shadow 0.2s ease, transform 0.2s ease",
          "&:hover": {
            boxShadow: "0 6px 20px rgba(249,168,212,0.22)",
            transform: "translateY(-2px)",
            // Reveal action buttons on hover
            "& .card-actions": { opacity: 1 },
          },
        }}
      >
        {/* Image */}
        {localCard.imageUrl ? (
          <Box
            component="img"
            src={localCard.imageUrl}
            alt={localCard.word}
            sx={{
              width: "100%",
              height: 120,
              objectFit: "cover",
              display: "block",
              bgcolor: "#FFF0F8",
            }}
          />
        ) : (
          <Box
            sx={{
              width: "100%",
              height: 120,
              bgcolor: "linear-gradient(135deg, #FFF0F8 0%, #FAF5FF 100%)",
              background: "linear-gradient(135deg, #FFF0F8 0%, #FAF5FF 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography sx={{ fontSize: "2rem" }}>🌸</Typography>
          </Box>
        )}

        {/* Action buttons — fade in on hover */}
        <Box
          className="card-actions"
          sx={{
            position: "absolute",
            top: 6,
            right: 6,
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
                width: 26,
                height: 26,
                bgcolor: "rgba(255,255,255,0.92)",
                backdropFilter: "blur(4px)",
                border: "1px solid rgba(249,168,212,0.5)",
                color: "#BE185D",
                "&:hover": { bgcolor: "#FFF0F8" },
              }}
            >
              <EditIcon sx={{ fontSize: 13 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Delete card">
            <IconButton
              size="small"
              onClick={() => onDelete(localCard.id)}
              sx={{
                width: 26,
                height: 26,
                bgcolor: "rgba(255,255,255,0.92)",
                backdropFilter: "blur(4px)",
                border: "1px solid rgba(249,168,212,0.5)",
                color: "#BE185D",
                "&:hover": { bgcolor: "#FFF0F8", color: "#DC2626" },
              }}
            >
              <DeleteOutlineIcon sx={{ fontSize: 13 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Card body */}
        <Box sx={{ p: "10px 12px 12px" }}>
          {/* Word + reading */}
          <Box sx={{ mb: 0.75 }}>
            <Typography
              sx={{
                fontSize: "1.1rem",
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
                  fontSize: "0.72rem",
                  color: "#C2709A",
                  fontFamily: '"Nunito", sans-serif',
                  mt: 0.1,
                }}
              >
                {subtitleText}
              </Typography>
            )}
          </Box>

          {/* Meaning */}
          <Typography
            sx={{
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "#1F2937",
              fontFamily: '"Nunito", sans-serif',
              mb: localCard.example_jp ? 0.75 : 0,
            }}
          >
            {localCard.meaning}
          </Typography>

          {/* Example sentences */}
          {localCard.example_jp && (
            <Box
              sx={{
                bgcolor: "#FFF0F8",
                borderRadius: "8px",
                px: 1.25,
                py: "6px",
                borderLeft: "3px solid rgba(244,114,182,0.5)",
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.7rem",
                  color: "#6B21A8",
                  fontFamily: '"Nunito", sans-serif',
                  lineHeight: 1.5,
                }}
              >
                {localCard.example_jp}
              </Typography>
              {localCard.example_en && (
                <Typography
                  sx={{
                    fontSize: "0.66rem",
                    color: "#9CA3AF",
                    fontFamily: '"Nunito", sans-serif',
                    lineHeight: 1.4,
                    mt: 0.25,
                  }}
                >
                  {localCard.example_en}
                </Typography>
              )}
            </Box>
          )}
        </Box>
        <Chip
          label={card.mainViewMode === "kanji" ? "漢字" : "ひ"}
          size="small"
          sx={{
            fontSize: "0.72rem",
            fontWeight: 700,
            background:
              card.mainViewMode === "kanji"
                ? "linear-gradient(90deg, #ede9fe, #ddd6fe)"
                : "linear-gradient(90deg, #fce7f3, #fce7f3)",
            color: card.mainViewMode === "kanji" ? "#7c3aed" : "#be185d",
            border: "1.5px solid",
            borderColor:
              card.mainViewMode === "kanji"
                ? "rgba(196,181,253,0.6)"
                : "rgba(249,168,212,0.5)",
          }}
        />
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

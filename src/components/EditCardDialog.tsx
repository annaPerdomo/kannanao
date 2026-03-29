"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Box,
  TextField,
  Button,
  Typography,
  IconButton,
  CircularProgress,
  Divider,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import SaveIcon from "@mui/icons-material/Save";
import ImageSearchIcon from "@mui/icons-material/ImageSearch";
import type { Flashcard } from "@/types/flashcard";
import { dbUpdateCard } from "@/lib/supabase";
import { fetchImage } from "@/services/api";

interface EditCardDialogProps {
  card: Flashcard | null;
  open: boolean;
  onClose: () => void;
  onSave: (updated: Flashcard) => void;
}

type EditableFields = Pick<
  Flashcard,
  "word" | "reading" | "meaning" | "example_jp" | "example_en" | "imageUrl"
>;

const fieldConfig: {
  key: keyof EditableFields;
  label: string;
  placeholder: string;
  multiline?: boolean;
  rows?: number;
  helperText?: string;
}[] = [
  {
    key: "word",
    label: "日本語 (Japanese Word)",
    placeholder: "e.g. 猫",
    helperText: "The Japanese word or phrase",
  },
  {
    key: "reading",
    label: "Reading (Furigana)",
    placeholder: "e.g. ねこ",
    helperText: "Hiragana/katakana reading",
  },
  {
    key: "meaning",
    label: "Meaning (English)",
    placeholder: "e.g. cat",
    helperText: "English translation",
  },
  {
    key: "example_jp",
    label: "Example Sentence (JP)",
    placeholder: "e.g. 猫が好きです。",
    multiline: true,
    rows: 2,
    helperText: "Japanese example sentence",
  },
  {
    key: "example_en",
    label: "Example Sentence (EN)",
    placeholder: "e.g. I like cats.",
    multiline: true,
    rows: 2,
    helperText: "English translation of example",
  },
];

export function EditCardDialog({
  card,
  open,
  onClose,
  onSave,
}: EditCardDialogProps) {
  const [fields, setFields] = useState<EditableFields>({
    word: "",
    reading: "",
    meaning: "",
    example_jp: "",
    example_en: "",
    imageUrl: undefined,
  });
  const [imageQuery, setImageQuery] = useState("");
  const [savingImage, setSavingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageError, setImageError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);

  // Reset form when card changes
  useEffect(() => {
    if (card) {
      setFields({
        word: card.word,
        reading: card.reading,
        meaning: card.meaning,
        example_jp: card.example_jp,
        example_en: card.example_en,
        imageUrl: card.imageUrl,
      });
      setImageQuery(card.image_query || card.word || "");
      setPreviewUrl(card.imageUrl);
      setImageError("");
    }
  }, [card]);

  const handleFieldChange =
    (key: keyof EditableFields) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFields((prev) => ({ ...prev, [key]: e.target.value }));
    };

  const handleRegenerateImage = async () => {
    const query = imageQuery.trim() || fields.word;
    if (!query) return;
    setImageError("");
    setSavingImage(true);
    try {
      const url = await fetchImage(query);
      if (url) {
        setPreviewUrl(url);
        setFields((prev) => ({ ...prev, imageUrl: url }));
      } else {
        setImageError(
          "No image found for that query. Try a different search term.",
        );
      }
    } catch {
      setImageError("Failed to fetch image. Please try again.");
    } finally {
      setSavingImage(false);
    }
  };

  const handleSave = async () => {
    if (!card) return;
    setSaving(true);
    try {
      const patch: Partial<Flashcard> = {
        word: fields.word,
        reading: fields.reading,
        meaning: fields.meaning,
        example_jp: fields.example_jp,
        example_en: fields.example_en,
        imageUrl: fields.imageUrl,
      };
      onSave({ ...card, ...patch });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const sharedTextFieldSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: "10px",
      fontFamily: '"Nunito", sans-serif',
      fontSize: "0.875rem",
      "& fieldset": { borderColor: "rgba(249,168,212,0.4)" },
      "&:hover fieldset": { borderColor: "#F472B6" },
      "&.Mui-focused fieldset": {
        borderColor: "#EC4899",
        borderWidth: "1.5px",
      },
    },
    "& .MuiInputLabel-root": {
      fontFamily: '"Nunito", sans-serif',
      fontSize: "0.8rem",
      color: "#BE185D",
      "&.Mui-focused": { color: "#EC4899" },
    },
    "& .MuiFormHelperText-root": {
      fontFamily: '"Nunito", sans-serif',
      fontSize: "0.68rem",
      color: "#C2709A",
    },
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "18px",
          border: "1.5px solid rgba(249,168,212,0.35)",
          boxShadow: "0 8px 40px rgba(249,168,212,0.2)",
          bgcolor: "#FFFBFE",
          overflow: "hidden",
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          p: "16px 20px 14px",
          background: "linear-gradient(135deg, #FFF0F8 0%, #FAF5FF 100%)",
          borderBottom: "1.5px solid rgba(249,168,212,0.2)",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Box sx={{ flexGrow: 1 }}>
          <Typography
            sx={{
              fontSize: "1rem",
              fontWeight: 800,
              color: "#9D174D",
              fontFamily: '"Nunito", sans-serif',
              lineHeight: 1.2,
            }}
          >
            Edit Card
          </Typography>
          {card?.word && (
            <Typography
              sx={{
                fontSize: "0.72rem",
                color: "#C2709A",
                fontFamily: '"Nunito", sans-serif',
                mt: 0.25,
              }}
            >
              {card.word} {card.reading ? `· ${card.reading}` : ""}
            </Typography>
          )}
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            border: "1.5px solid rgba(249,168,212,0.4)",
            borderRadius: "8px",
            width: 28,
            height: 28,
            color: "#BE185D",
            "&:hover": { bgcolor: "#FFF0F8" },
          }}
        >
          <CloseIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent
        sx={{ p: "20px", display: "flex", flexDirection: "column", gap: 2 }}
      >
        {/* Text fields */}
        {fieldConfig.map(
          ({ key, label, placeholder, multiline, rows, helperText }) => (
            <TextField
              key={key}
              label={label}
              value={fields[key] ?? ""}
              onChange={handleFieldChange(key)}
              placeholder={placeholder}
              multiline={multiline}
              rows={rows}
              helperText={helperText}
              fullWidth
              size="small"
              sx={sharedTextFieldSx}
            />
          ),
        )}

        <Divider sx={{ borderColor: "rgba(249,168,212,0.25)", my: 0.5 }} />

        {/* Image section */}
        <Box>
          <Typography
            sx={{
              fontSize: "0.6rem",
              fontWeight: 800,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#EC4899",
              fontFamily: '"Nunito", sans-serif',
              mb: 1.25,
            }}
          >
            Card Image
          </Typography>

          {/* Image preview */}
          {previewUrl && (
            <Box
              sx={{
                position: "relative",
                borderRadius: "12px",
                overflow: "hidden",
                border: "1.5px solid rgba(249,168,212,0.35)",
                mb: 1.5,
                height: 140,
                bgcolor: "#FFF0F8",
              }}
            >
              <Box
                component="img"
                src={previewUrl}
                alt="Card image preview"
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </Box>
          )}

          {/* Query input + button */}
          <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
            <TextField
              label="Image Search Query"
              value={imageQuery}
              onChange={(e) => {
                setImageQuery(e.target.value);
                setImageError("");
              }}
              placeholder={`e.g. ${fields.word || "sakura"}`}
              size="small"
              fullWidth
              helperText={imageError || "Search term used to find the image"}
              error={!!imageError}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleRegenerateImage();
                }
              }}
              sx={{
                ...sharedTextFieldSx,
                "& .MuiFormHelperText-root": {
                  ...sharedTextFieldSx["& .MuiFormHelperText-root"],
                  color: imageError ? "error.main" : "#C2709A",
                },
              }}
            />
            <Tooltip title={previewUrl ? "Regenerate image" : "Fetch image"}>
              <span>
                <Button
                  variant="outlined"
                  onClick={handleRegenerateImage}
                  disabled={savingImage}
                  startIcon={
                    savingImage ? (
                      <CircularProgress size={13} sx={{ color: "#EC4899" }} />
                    ) : previewUrl ? (
                      <AutorenewIcon sx={{ fontSize: 15 }} />
                    ) : (
                      <ImageSearchIcon sx={{ fontSize: 15 }} />
                    )
                  }
                  sx={{
                    borderRadius: "10px",
                    height: 40,
                    minWidth: "auto",
                    px: 1.5,
                    flexShrink: 0,
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    textTransform: "none",
                    borderColor: "rgba(249,168,212,0.5)",
                    color: "#BE185D",
                    "&:hover": {
                      borderColor: "#F472B6",
                      bgcolor: "#FFF0F8",
                    },
                  }}
                >
                  {savingImage ? "Searching…" : previewUrl ? "Regen" : "Fetch"}
                </Button>
              </span>
            </Tooltip>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: "20px",
          pb: "16px",
          pt: 0,
          gap: 1,
        }}
      >
        <Button
          onClick={onClose}
          disabled={saving}
          sx={{
            borderRadius: "9px",
            color: "#BE185D",
            fontWeight: 700,
            fontFamily: '"Nunito", sans-serif',
            textTransform: "none",
            fontSize: "0.8rem",
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || !fields.word.trim()}
          startIcon={
            saving ? (
              <CircularProgress size={13} sx={{ color: "white" }} />
            ) : (
              <SaveIcon sx={{ fontSize: 15 }} />
            )
          }
          sx={{
            borderRadius: "9px",
            px: 2.5,
            fontWeight: 700,
            fontFamily: '"Nunito", sans-serif',
            textTransform: "none",
            fontSize: "0.8rem",
          }}
        >
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

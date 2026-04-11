"use client";

import { useCallback, useState, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  TextField,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import PushPinIcon from "@mui/icons-material/PushPin";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import CodeIcon from "@mui/icons-material/Code";
import { AddCardsModal } from "@/components/AddCardsModal";
import { EmbedDeckDialog } from "@/components/EmbedDeckDialog";
import { ImageCard } from "@/components/ImageCard";
import { Loading } from "@/components/Loading";
import { PdfImportModal } from "@/components/PdfImportModal";
import { AddExistingCardsDialog } from "@/components/AddExistingCardsDialog";
import { useDecks } from "@/hooks/useDecks";
import { useCards } from "@/hooks/useCards";
import { useGenerateFlashcards } from "@/hooks/useGenerateFlashcards";
import { fetchImage } from "@/services/api";
import type { GeneratedCard } from "@/types/flashcard";
import { useAuth } from "@/contexts/AuthContext";
import type { PracticeMode } from "@/types/app";

interface DeckProps {
  deckId: string;
  onBack: () => void;
  onStudy: () => void;
  onPractice: (mode: PracticeMode) => void;
}

// Practice mode tiles use intentional semantic colors (purple, cyan, amber) for visual distinction
const practiceConfig: {
  mode: PracticeMode;
  label: string;
  description: string;
  emoji: string;
  watermark: string;
  color: string;
  bg: string;
  border: string;
  shadowColor: string;
}[] = [
  {
    mode: "match",
    label: "Match",
    description: "Pair Japanese to English",
    emoji: "🎯",
    watermark: "合",
    color: "#6D28D9",
    bg: "linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)",
    border: "rgba(196,181,253,0.7)",
    shadowColor: "rgba(109,40,217,0.22)",
  },
  {
    mode: "fill",
    label: "Fill in Blank",
    description: "Complete the sentence",
    emoji: "✏️",
    watermark: "書",
    color: "#0E7490",
    bg: "linear-gradient(135deg, #ECFEFF 0%, #CFFAFE 100%)",
    border: "rgba(34,211,238,0.6)",
    shadowColor: "rgba(14,116,144,0.22)",
  },
  {
    mode: "recall",
    label: "Recall Typing",
    description: "Type from memory",
    emoji: "🌟",
    watermark: "思",
    color: "#B45309",
    bg: "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)",
    border: "rgba(251,191,36,0.7)",
    shadowColor: "rgba(180,83,9,0.22)",
  },
];

function Label({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      sx={{
        display: "block",
        mb: 1.5,
        fontSize: "0.6rem",
        fontWeight: 800,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: "primary.main",
        fontFamily: '"Nunito", sans-serif',
      }}
    >
      {children}
    </Typography>
  );
}

export default function Deck({ deckId, onBack, onStudy, onPractice }: DeckProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;

  const { user } = useAuth();
  const {
    decks,
    loading: decksLoading,
    updateDeckCount,
    renameDeck,
    pinDeck,
  } = useDecks();
  const deck = decks.find((d) => d.id === deckId);

  const [pdfImportOpen, setPdfImportOpen] = useState(false);
  const [addCardsOpen, setAddCardsOpen] = useState(false);
  const [embedOpen, setEmbedOpen] = useState(false);
  const [deckIsPublic, setDeckIsPublic] = useState(deck?.isPublic ?? false);
  const [pendingMainViewMode, setPendingMainViewMode] = useState<'hiragana' | 'kanji'>('hiragana');

  const handlePdfCards = async (extracted: GeneratedCard[]) => {
    const withImages = await Promise.all(
      extracted.map(async (card) => {
        const imageUrl = await fetchImage(card.image_query).catch(() => null);
        return {
          ...card,
          imageUrl: imageUrl ?? undefined,
          deckId,
          mainViewMode: pendingMainViewMode,
          cardType: card.card_type,
          jlptLevel: card.jlpt_level ?? undefined,
        };
      }),
    );
    await addCards(withImages);
    setPdfImportOpen(false);
  };

  // ── Rename state ──────────────────────────────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameVal, setNameVal] = useState("");
  const [descVal, setDescVal] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  const startEdit = useCallback(() => {
    if (!deck) return;
    setNameVal(deck.name);
    setDescVal(deck.description ?? "");
    setEditing(true);
    setTimeout(() => nameInputRef.current?.focus(), 0);
  }, [deck]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
  }, []);

  const commitEdit = useCallback(async () => {
    const trimmedName = nameVal.trim();
    const trimmedDesc = descVal.trim();
    if (!trimmedName || !deck) {
      setEditing(false);
      return;
    }

    const nameChanged = trimmedName !== deck.name;
    const descChanged = trimmedDesc !== (deck.description ?? "");
    if (!nameChanged && !descChanged) {
      setEditing(false);
      return;
    }

    setRenaming(true);
    try {
      await renameDeck(deckId, trimmedName, trimmedDesc || undefined);
    } finally {
      setRenaming(false);
      setEditing(false);
    }
  }, [nameVal, descVal, deck, deckId, renameDeck]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") void commitEdit();
      if (e.key === "Escape") cancelEdit();
    },
    [commitEdit, cancelEdit],
  );
  // ─────────────────────────────────────────────────────────────────────────

  const [pickerOpen, setPickerOpen] = useState(false);

  const handleCountChange = useCallback(
    (count: number) => updateDeckCount(deckId, count),
    [deckId, updateDeckCount],
  );

  const {
    cards,
    addCards,
    deleteCard,
    loading: cardsLoading,
    updateCard,
    copyExistingCards,
  } = useCards(deckId, handleCountChange);
  const { generating, error, generate } = useGenerateFlashcards();

  const handleGenerate = async (words: string[], mainViewMode: 'hiragana' | 'kanji') => {
    const generated = await generate(words, deckId, mainViewMode);
    addCards(generated.map((card) => ({ ...card, deckId })));
  };

  if (decksLoading || cardsLoading) {
    return (
      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 4 }, py: 4 }}>
        <Loading message="Loading cards…" />
      </Box>
    );
  }

  if (!deck) {
    return (
      <Box sx={{ p: 4 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={onBack}>
          Back
        </Button>
        <Typography color="error" sx={{ mt: 2 }}>
          Deck not found.
        </Typography>
      </Box>
    );
  }

  const practiceDisabled = cards.length < 2;

  return (
    <Box
      sx={{
        maxWidth: 1200,
        mx: "auto",
        px: { xs: 2, sm: 4 },
        py: { xs: 3, sm: 4 },
      }}
    >
      {/* ── DECK HEADER ── */}
      <Box
        sx={{
          position: "relative",
          mb: 3,
          borderRadius: "16px",
          overflow: "hidden",
          bgcolor: "#FFFFFF",
          border: `1.5px solid ${alpha(brand[300], 0.35)}`,
          boxShadow: `0 2px 12px ${alpha(brand[300], 0.12)}`,
        }}
      >
        <Box
          sx={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            background: `linear-gradient(180deg, ${brand[200]} 0%, ${brand[400]} 50%, ${accent[300]} 100%)`,
            borderRadius: "16px 0 0 16px",
          }}
        />

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            px: { xs: 2.5, sm: 3 },
            pl: { xs: 3.5, sm: 4 },
            py: { xs: 2, sm: 2.5 },
          }}
        >
          <IconButton
            onClick={onBack}
            size="small"
            sx={{
              border: `1.5px solid ${alpha(brand[300], 0.45)}`,
              borderRadius: "9px",
              width: 32,
              height: 32,
              flexShrink: 0,
              color: brand[700],
              "&:hover": { bgcolor: brand[50], borderColor: brand[400] },
            }}
          >
            <ArrowBackIcon sx={{ fontSize: 15 }} />
          </IconButton>

          {/* ── Name / inline edit ── */}
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            {editing ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {/* ── Row 1: name field + action buttons ── */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <TextField
                    inputRef={nameInputRef}
                    value={nameVal}
                    onChange={(e) => setNameVal(e.target.value)}
                    onKeyDown={handleKeyDown}
                    size="small"
                    autoComplete="off"
                    disabled={renaming}
                    placeholder="Deck name"
                    sx={{
                      flexGrow: 1,
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "9px",
                        fontSize: "1.25rem",
                        fontWeight: 700,
                        color: brand[800],
                        fontFamily: '"Nunito", sans-serif',
                        "& fieldset": { borderColor: alpha(brand[400], 0.5) },
                        "&:hover fieldset": { borderColor: brand[400] },
                        "&.Mui-focused fieldset": { borderColor: brand[500] },
                      },
                    }}
                  />
                  {renaming ? (
                    <CircularProgress
                      size={18}
                      sx={{ color: "primary.main", flexShrink: 0 }}
                    />
                  ) : (
                    <>
                      <Tooltip title="Save (Enter)">
                        <IconButton
                          size="small"
                          onClick={commitEdit}
                          sx={{
                            width: 30,
                            height: 30,
                            borderRadius: "8px",
                            bgcolor: brand[50],
                            border: `1.5px solid ${alpha(brand[400], 0.4)}`,
                            color: brand[700],
                            "&:hover": {
                              bgcolor: brand[100],
                              borderColor: brand[400],
                            },
                          }}
                        >
                          <CheckIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Cancel (Esc)">
                        <IconButton
                          size="small"
                          onClick={cancelEdit}
                          sx={{
                            width: 30,
                            height: 30,
                            borderRadius: "8px",
                            color: "text.secondary",
                            border: "1.5px solid rgba(0,0,0,0.1)",
                            "&:hover": { bgcolor: "rgba(0,0,0,0.04)" },
                          }}
                        >
                          <CloseIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </Box>

                {/* ── Row 2: description field ── */}
                <TextField
                  value={descVal}
                  onChange={(e) => setDescVal(e.target.value)}
                  onKeyDown={handleKeyDown}
                  size="small"
                  autoComplete="off"
                  disabled={renaming}
                  placeholder="Description (optional)"
                  sx={{
                    pr: "76px",
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "9px",
                      fontSize: "0.82rem",
                      color: brand[500],
                      fontFamily: '"Nunito", sans-serif',
                      "& fieldset": { borderColor: alpha(brand[400], 0.35) },
                      "&:hover fieldset": { borderColor: brand[400] },
                      "&.Mui-focused fieldset": { borderColor: brand[500] },
                    },
                  }}
                />
              </Box>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  minWidth: 0,
                }}
              >
                <Typography
                  variant="h4"
                  sx={{ color: brand[800], lineHeight: 1.1, minWidth: 0 }}
                >
                  {deck.name}
                </Typography>
                <Tooltip title="Rename deck">
                  <IconButton
                    size="small"
                    onClick={startEdit}
                    sx={{
                      width: 26,
                      height: 26,
                      borderRadius: "7px",
                      flexShrink: 0,
                      color: alpha(brand[700], 0.45),
                      "&:hover": {
                        bgcolor: brand[50],
                        color: brand[700],
                      },
                    }}
                  >
                    <EditIcon sx={{ fontSize: 13 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            )}

            {!editing && deck.description && (
              <Typography variant="body2" sx={{ color: brand[500], mt: 0.25 }}>
                {deck.description}
              </Typography>
            )}
          </Box>

          {!editing && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
              <Tooltip title={deckIsPublic ? "Embed (public)" : "Embed deck"}>
                <IconButton
                  size="small"
                  onClick={() => setEmbedOpen(true)}
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: "8px",
                    border: `1.5px solid ${deckIsPublic ? alpha(accent[500], 0.6) : alpha(brand[300], 0.45)}`,
                    bgcolor: deckIsPublic ? alpha(accent[100], 0.8) : "transparent",
                    color: deckIsPublic ? accent[600] : alpha(brand[500], 0.55),
                    "&:hover": {
                      bgcolor: alpha(accent[100], 0.8),
                      color: accent[600],
                      borderColor: alpha(accent[500], 0.6),
                    },
                  }}
                >
                  <CodeIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title={deck.pinned ? "Unpin from home" : "Pin to home"}>
                <IconButton
                  size="small"
                  onClick={() => pinDeck(deck.id, !deck.pinned)}
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: "8px",
                    border: `1.5px solid ${deck.pinned ? alpha(brand[500], 0.6) : alpha(brand[300], 0.45)}`,
                    bgcolor: deck.pinned ? alpha(brand[100], 0.8) : "transparent",
                    color: deck.pinned ? brand[600] : alpha(brand[500], 0.55),
                    "&:hover": {
                      bgcolor: alpha(brand[100], 0.8),
                      color: brand[600],
                      borderColor: alpha(brand[500], 0.6),
                    },
                  }}
                >
                  {deck.pinned
                    ? <PushPinIcon sx={{ fontSize: 14 }} />
                    : <PushPinOutlinedIcon sx={{ fontSize: 14 }} />
                  }
                </IconButton>
              </Tooltip>
              <Chip
                label={`${cards.length} card${cards.length !== 1 ? "s" : ""}`}
                size="small"
                sx={{
                  borderRadius: "8px",
                  bgcolor: brand[50],
                  border: `1.5px solid ${alpha(brand[400], 0.4)}`,
                  color: brand[700],
                  fontWeight: 800,
                  fontSize: "0.7rem",
                }}
              />
            </Box>
          )}
        </Box>
      </Box>

      {/* ── PRACTICE HERO ── */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${brand[50]} 0%, ${accent[50]} 100%)`,
          borderRadius: "20px",
          border: `1.5px solid ${alpha(brand[300], 0.35)}`,
          p: { xs: 2.5, sm: 3.5 },
          mb: 3,
        }}
      >
        <Label>Let&apos;s practice!</Label>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
            gap: { xs: 1.5, sm: 2 },
          }}
        >
          {/* Flashcards – primary CTA */}
          <Box
            onClick={cards.length > 0 ? onStudy : undefined}
            sx={{
              cursor: cards.length > 0 ? "pointer" : "default",
              position: "relative",
              overflow: "hidden",
              borderRadius: "18px",
              p: { xs: "20px 18px", sm: "24px 22px" },
              minHeight: 160,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              background: cards.length > 0
                ? `linear-gradient(145deg, ${brand[400]} 0%, ${brand[500]} 40%, ${accent[400]} 100%)`
                : "rgba(200,200,200,0.3)",
              border: "1.5px solid transparent",
              opacity: cards.length > 0 ? 1 : 0.5,
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
              boxShadow: cards.length > 0
                ? `0 6px 24px ${alpha(brand[500], 0.35)}`
                : "none",
              ...(cards.length > 0 && {
                "&:hover": {
                  transform: "translateY(-5px) scale(1.02)",
                  boxShadow: `0 14px 36px ${alpha(brand[500], 0.45)}`,
                },
              }),
            }}
          >
            {/* Watermark */}
            <Typography
              aria-hidden
              sx={{
                position: "absolute",
                bottom: -16,
                right: 6,
                fontSize: "5.5rem",
                lineHeight: 1,
                opacity: 0.18,
                userSelect: "none",
                fontFamily: '"Noto Serif JP", serif',
                fontWeight: 900,
              }}
            >
              学
            </Typography>

            <Box>
              <Typography sx={{ fontSize: "2rem", lineHeight: 1, mb: 1 }}>✨</Typography>
              <Typography
                sx={{
                  fontWeight: 900,
                  fontSize: { xs: "1rem", sm: "1.05rem" },
                  color: "#FFFFFF",
                  fontFamily: '"Nunito", sans-serif',
                  lineHeight: 1.2,
                  textShadow: "0 1px 4px rgba(0,0,0,0.15)",
                }}
              >
                Flashcards
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.72rem",
                  color: "rgba(255,255,255,0.85)",
                  fontFamily: '"Nunito", sans-serif',
                  mt: 0.4,
                }}
              >
                Flip & learn every card
              </Typography>
            </Box>

            <Typography
              sx={{
                fontSize: "0.72rem",
                fontWeight: 800,
                color: "rgba(255,255,255,0.9)",
                fontFamily: '"Nunito", sans-serif',
                letterSpacing: "0.04em",
                alignSelf: "flex-end",
              }}
            >
              Let&apos;s go →
            </Typography>
          </Box>

          {/* Practice mode tiles */}
          {practiceConfig.map(({ mode, label, description, emoji, watermark, color, bg, border, shadowColor }) => (
            <Box
              key={mode}
              onClick={!practiceDisabled ? () => onPractice(mode) : undefined}
              sx={{
                cursor: practiceDisabled ? "default" : "pointer",
                position: "relative",
                overflow: "hidden",
                borderRadius: "18px",
                p: { xs: "20px 18px", sm: "24px 22px" },
                minHeight: 160,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                background: bg,
                border: "1.5px solid",
                borderColor: border,
                opacity: practiceDisabled ? 0.45 : 1,
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                ...(!practiceDisabled && {
                  "&:hover": {
                    transform: "translateY(-5px) scale(1.02)",
                    boxShadow: `0 12px 32px ${shadowColor}`,
                  },
                }),
              }}
            >
              {/* Kanji watermark */}
              <Typography
                aria-hidden
                sx={{
                  position: "absolute",
                  bottom: -16,
                  right: 6,
                  fontSize: "5.5rem",
                  lineHeight: 1,
                  color,
                  opacity: 0.08,
                  fontFamily: '"Noto Serif JP", serif',
                  fontWeight: 900,
                  userSelect: "none",
                }}
              >
                {watermark}
              </Typography>

              <Box>
                <Typography sx={{ fontSize: "1.85rem", lineHeight: 1, mb: 1 }}>{emoji}</Typography>
                <Typography
                  sx={{
                    fontWeight: 900,
                    fontSize: { xs: "0.92rem", sm: "0.98rem" },
                    color,
                    fontFamily: '"Nunito", sans-serif',
                    lineHeight: 1.2,
                  }}
                >
                  {label}
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.7rem",
                    color: `${color}BB`,
                    fontFamily: '"Nunito", sans-serif',
                    mt: 0.4,
                  }}
                >
                  {description}
                </Typography>
              </Box>

              <Typography
                sx={{
                  fontSize: "0.7rem",
                  fontWeight: 800,
                  color: practiceDisabled ? "text.disabled" : color,
                  fontFamily: '"Nunito", sans-serif',
                  letterSpacing: "0.04em",
                  opacity: practiceDisabled ? 0.5 : 0.8,
                  alignSelf: "flex-end",
                }}
              >
                {practiceDisabled ? "Locked 🔒" : "Play →"}
              </Typography>
            </Box>
          ))}
        </Box>
        {practiceDisabled && cards.length > 0 && (
          <Typography
            sx={{
              fontSize: "0.7rem",
              color: "text.secondary",
              fontFamily: '"Nunito", sans-serif',
              mt: 1.5,
              textAlign: "center",
            }}
          >
            Add at least 2 cards to unlock practice modes.
          </Typography>
        )}
      </Box>

      {/* ── CARDS ── */}
      <Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 1.5,
          }}
        >
          <Label>Cards in Deck</Label>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon sx={{ fontSize: 15 }} />}
            onClick={() => setAddCardsOpen(true)}
            sx={{
              borderRadius: "9px",
              px: 2,
              py: "5px",
              fontSize: "0.76rem",
              textTransform: "none",
              fontWeight: 700,
              mb: 1.5,
            }}
          >
            Add Cards
          </Button>
        </Box>

        {cards.length === 0 ? (
          <Box
            sx={{
              border: `1.5px dashed ${alpha(brand[300], 0.4)}`,
              borderRadius: "14px",
              p: 6,
              textAlign: "center",
              bgcolor: "rgba(255,255,255,0.6)",
            }}
          >
            <Typography sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
              No cards yet —{" "}
              <Box
                component="span"
                onClick={() => setAddCardsOpen(true)}
                sx={{
                  color: "primary.main",
                  fontWeight: 700,
                  cursor: "pointer",
                  textDecoration: "underline",
                  textUnderlineOffset: 2,
                }}
              >
                add some
              </Box>{" "}
              to get started.
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(2, 1fr)",
                sm: "repeat(3, 1fr)",
                lg: "repeat(4, 1fr)",
              },
              gap: 1.75,
            }}
          >
            {cards.map((card) => (
              <ImageCard
                key={card.id}
                card={card}
                onDelete={deleteCard}
                onUpdate={updateCard}
              />
            ))}
          </Box>
        )}
      </Box>

      <AddCardsModal
        open={addCardsOpen}
        onClose={() => setAddCardsOpen(false)}
        onGenerate={handleGenerate}
        generating={generating}
        error={error}
        onAddExisting={(mainViewMode) => {
          setPendingMainViewMode(mainViewMode);
          setAddCardsOpen(false);
          setPickerOpen(true);
        }}
        onImportPdf={(mainViewMode) => {
          setPendingMainViewMode(mainViewMode);
          setAddCardsOpen(false);
          setPdfImportOpen(true);
        }}
      />

      <AddExistingCardsDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        targetDeckId={deckId}
        userId={user?.id ?? ""}
        onConfirm={(cards) => copyExistingCards(cards.map((c) => ({ ...c, mainViewMode: pendingMainViewMode })))}
      />

      <PdfImportModal
        open={pdfImportOpen}
        onClose={() => setPdfImportOpen(false)}
        onAddCards={handlePdfCards}
      />

      <EmbedDeckDialog
        open={embedOpen}
        onClose={() => setEmbedOpen(false)}
        deckId={deckId}
        deckName={deck.name}
        isPublic={deckIsPublic}
        onPublicChange={setDeckIsPublic}
      />
    </Box>
  );
}

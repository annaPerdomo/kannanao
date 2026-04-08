"use client";
import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { useDecks } from "@/hooks/useDecks";
import { useGenerateFlashcards } from "@/hooks/useGenerateFlashcards";
import { useAuth } from "@/contexts/AuthContext";
import { dbInsertCards, dbCopyCardsIntoDeck } from "@/lib/supabase";
import { AddExistingCardsDialog } from "@/components/AddExistingCardsDialog";
import { PdfImportModal } from "@/components/PdfImportModal";
import { WordChipInput } from "@/components/WordChipInput";
import { OrDivider, AddCardOptionButtons } from "@/components/AddCardOptionButtons";
import { useRouter } from "next/navigation";
import type { Flashcard } from "@/types/flashcard";

export function CreateDeckDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { createDeck } = useDecks();
  const { user } = useAuth();
  const router = useRouter();
  const { generating, error, generate } = useGenerateFlashcards();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [input, setInput] = useState("");
  const [words, setWords] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // Post-creation dialog state
  const [createdDeckId, setCreatedDeckId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);

  const busy = creating || generating;

  const reset = () => {
    setName("");
    setDescription("");
    setInput("");
    setWords([]);
    setCreating(false);
    setCreatedDeckId(null);
  };

  const handleCreate = async () => {
    if (!name.trim() || busy) return;
    setCreating(true);
    try {
      const deck = await createDeck(name.trim(), description.trim() || undefined);
      const finalWords = input.trim() ? [...words, input.trim()] : words;
      if (finalWords.length > 0) {
        const generated = await generate(finalWords, deck.id);
        await dbInsertCards(deck.id, generated.map((card) => ({ ...card, deckId: deck.id })));
      }
      reset();
      onClose();
      router.push(`/deck/${deck.id}`);
    } finally {
      setCreating(false);
    }
  };

  const navigateToDeck = (deckId: string) => {
    reset();
    onClose();
    router.push(`/deck/${deckId}`);
  };

  const handleAddExisting = async () => {
    if (!name.trim() || busy) return;
    setCreating(true);
    try {
      const deck = await createDeck(name.trim(), description.trim() || undefined);
      setCreatedDeckId(deck.id);
      setPickerOpen(true);
    } finally {
      setCreating(false);
    }
  };

  const handleImportPdf = async () => {
    if (!name.trim() || busy) return;
    setCreating(true);
    try {
      const deck = await createDeck(name.trim(), description.trim() || undefined);
      setCreatedDeckId(deck.id);
      setPdfOpen(true);
    } finally {
      setCreating(false);
    }
  };

  const handlePickerConfirm = async (cards: Flashcard[]) => {
    if (!createdDeckId) return;
    await dbCopyCardsIntoDeck(createdDeckId, cards);
    setPickerOpen(false);
    navigateToDeck(createdDeckId);
  };

  const handlePickerClose = () => {
    setPickerOpen(false);
    if (createdDeckId) navigateToDeck(createdDeckId);
  };

  const handlePdfClose = () => {
    setPdfOpen(false);
    if (createdDeckId) navigateToDeck(createdDeckId);
  };

  const canGenerate = words.length > 0 || input.trim().length > 0;

  return (
    <>
      <Dialog
        open={open}
        onClose={busy ? undefined : onClose}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              bgcolor: "#FFF3F9",
              backgroundImage: "none",
              border: "1px solid rgba(249,168,212,0.45)",
              boxShadow: "0 16px 36px rgba(249,168,212,0.18)",
              borderRadius: 3,
            },
          },
        }}
      >
        <DialogTitle
          sx={{ fontFamily: '"DM Serif Display", serif', fontWeight: 400, pb: 0 }}
        >
          New Deck
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              fontFamily: "inherit",
              fontWeight: 400,
              fontSize: "0.8rem",
              mt: 0.25,
            }}
          >
            Give your deck a name to get started
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ pt: "16px !important" }}>
          {/* Deck info */}
          <TextField
            label="Deck Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !canGenerate) void handleCreate();
            }}
            fullWidth
            autoFocus
            disabled={busy}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={2}
            disabled={busy}
            sx={{ mb: 2.5 }}
          />

          {/* Divider */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
            <Box sx={{ flexGrow: 1, height: "1px", bgcolor: "rgba(249,168,212,0.3)" }} />
            <Typography
              sx={{
                fontSize: "0.65rem",
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "rgba(194,112,154,0.7)",
                fontFamily: '"Nunito", sans-serif',
              }}
            >
              add cards (optional)
            </Typography>
            <Box sx={{ flexGrow: 1, height: "1px", bgcolor: "rgba(249,168,212,0.3)" }} />
          </Box>

          {/* AI Generation section */}
          <Box
            sx={{
              bgcolor: "#FFF8FC",
              border: "1.5px solid rgba(249,168,212,0.35)",
              borderRadius: "14px",
              p: 2,
              mb: 2,
            }}
          >
            <Typography
              sx={{
                fontSize: "0.6rem",
                fontWeight: 800,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#EC4899",
                fontFamily: '"Nunito", sans-serif',
                mb: 1.25,
              }}
            >
              Generate with AI
            </Typography>

            <WordChipInput
              words={words}
              onWordsChange={setWords}
              input={input}
              onInputChange={setInput}
              disabled={busy}
              inputId="create-deck-word-input"
            />

            {error && (
              <Alert
                severity="error"
                sx={{ mb: 1.25, fontSize: "0.73rem", py: 0.4, borderRadius: "9px" }}
              >
                {error}
              </Alert>
            )}

            {words.length > 0 && !busy && (
              <Typography
                sx={{
                  textAlign: "center",
                  fontSize: "0.67rem",
                  color: "#C2709A",
                  fontFamily: '"Nunito", sans-serif',
                  fontWeight: 600,
                }}
              >
                {words.length} word{words.length > 1 ? "s" : ""} queued
              </Typography>
            )}
          </Box>

          <OrDivider />

          <AddCardOptionButtons
            disabled={busy || !name.trim()}
            onAddExisting={handleAddExisting}
            onImportPdf={handleImportPdf}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={onClose}
            disabled={busy}
            sx={{ color: "text.secondary", textTransform: "none" }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || busy}
            variant="contained"
            startIcon={
              busy ? (
                <CircularProgress size={13} color="inherit" />
              ) : canGenerate ? (
                <AutoAwesomeIcon sx={{ fontSize: 14 }} />
              ) : undefined
            }
            sx={{
              bgcolor: "#BE185D",
              color: "#FFF0F6",
              textTransform: "none",
              borderRadius: 6,
              px: 2.5,
              "&:hover": { bgcolor: "#9D174D" },
              "&:disabled": {
                bgcolor: "rgba(190,24,93,0.2)",
                color: "rgba(255,240,246,0.5)",
              },
            }}
          >
            {generating ? "Generating cards…" : creating ? "Creating…" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <AddExistingCardsDialog
        open={pickerOpen}
        onClose={handlePickerClose}
        targetDeckId={createdDeckId ?? ""}
        userId={user?.id ?? ""}
        onConfirm={handlePickerConfirm}
      />

      <PdfImportModal
        open={pdfOpen}
        onClose={handlePdfClose}
        onAddCards={() => handlePdfClose()}
      />
    </>
  );
}

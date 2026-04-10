"use client";
import { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Typography, Box, CircularProgress, Alert,
  FormControlLabel, Switch,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { alpha } from "@mui/material/styles";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import PushPinIcon from "@mui/icons-material/PushPin";
import { useDecks } from "@/hooks/useDecks";
import { useGenerateFlashcards } from "@/hooks/useGenerateFlashcards";
import { useAuth } from "@/contexts/AuthContext";
import { dbInsertCards, dbCopyCardsIntoDeck } from "@/lib/supabase";
import { AddExistingCardsDialog } from "@/components/AddExistingCardsDialog";
import { PdfImportModal } from "@/components/PdfImportModal";
import { WordChipInput } from "@/components/WordChipInput";
import { OrDivider, AddCardOptionButtons } from "@/components/AddCardOptionButtons";
import { Loading } from "@/components/Loading";
import { useRouter } from "next/navigation";
import type { Flashcard } from "@/types/flashcard";

export function CreateDeckDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const theme = useTheme();
  const { brand, surfaces } = theme.palette;

  const { createDeck, pinDeck } = useDecks();
  const { user } = useAuth();
  const router = useRouter();
  const { generating, error, generate } = useGenerateFlashcards();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [input, setInput] = useState("");
  const [words, setWords] = useState<string[]>([]);
  const [pinToHome, setPinToHome] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdDeckId, setCreatedDeckId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);

  const busy = creating || generating;

  const reset = () => {
    setName(""); setDescription(""); setInput(""); setWords([]);
    setPinToHome(false); setCreating(false); setCreatedDeckId(null);
  };

  const handleCreate = async () => {
    if (!name.trim() || busy) return;
    setCreating(true);
    try {
      const deck = await createDeck(name.trim(), description.trim() || undefined);
      if (pinToHome) await pinDeck(deck.id, true);
      const finalWords = input.trim() ? [...words, input.trim()] : words;
      if (finalWords.length > 0) {
        const generated = await generate(finalWords, deck.id);
        await dbInsertCards(deck.id, generated.map((card) => ({ ...card, deckId: deck.id })));
      }
      reset(); onClose(); router.push(`/deck/${deck.id}`);
    } finally { setCreating(false); }
  };

  const navigateToDeck = (deckId: string) => { reset(); onClose(); router.push(`/deck/${deckId}`); };

  const handleAddExisting = async () => {
    if (!name.trim() || busy) return;
    setCreating(true);
    try {
      const deck = await createDeck(name.trim(), description.trim() || undefined);
      if (pinToHome) await pinDeck(deck.id, true);
      setCreatedDeckId(deck.id);
      setPickerOpen(true);
    } finally { setCreating(false); }
  };

  const handleImportPdf = async () => {
    if (!name.trim() || busy) return;
    setCreating(true);
    try {
      const deck = await createDeck(name.trim(), description.trim() || undefined);
      if (pinToHome) await pinDeck(deck.id, true);
      setCreatedDeckId(deck.id);
      setPdfOpen(true);
    } finally { setCreating(false); }
  };

  const handlePickerConfirm = async (cards: Flashcard[]) => {
    if (!createdDeckId) return;
    await dbCopyCardsIntoDeck(createdDeckId, cards);
    setPickerOpen(false); navigateToDeck(createdDeckId);
  };

  const canGenerate = words.length > 0 || input.trim().length > 0;

  const dialogPaperSx = {
    bgcolor: surfaces.input, backgroundImage: "none",
    border: `1px solid ${alpha(brand[300], 0.45)}`,
    boxShadow: `0 16px 36px ${alpha(brand[300], 0.18)}`,
    borderRadius: 3,
  };

  return (
    <>
      <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: dialogPaperSx } }}>
        <DialogTitle sx={{ fontFamily: '"DM Serif Display", serif', fontWeight: 400, pb: 0 }}>
          New Deck
          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "inherit", fontWeight: 400, fontSize: "0.8rem", mt: 0.25 }}>
            Give your deck a name to get started
          </Typography>
        </DialogTitle>

        {generating ? (
          <DialogContent>
            <Loading message="Generating cards…" />
          </DialogContent>
        ) : (
          <DialogContent sx={{ pt: "16px !important" }}>
            <TextField label="Deck Name" value={name} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !canGenerate) void handleCreate(); }}
              fullWidth autoFocus disabled={busy} sx={{ mb: 2 }} />
            <TextField label="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)}
              fullWidth multiline rows={2} disabled={busy} sx={{ mb: 2 }} />

            {/* Pin toggle */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 2.5,
                px: 1.5,
                py: 1,
                borderRadius: 2,
                border: `1.5px solid ${pinToHome ? alpha(brand[400], 0.55) : alpha(brand[300], 0.3)}`,
                bgcolor: pinToHome ? alpha(brand[50], 0.8) : "transparent",
                transition: "all 0.18s ease",
                cursor: "pointer",
              }}
              onClick={() => setPinToHome((v) => !v)}
            >
              {pinToHome
                ? <PushPinIcon sx={{ fontSize: "1rem", color: brand[600], flexShrink: 0 }} />
                : <PushPinOutlinedIcon sx={{ fontSize: "1rem", color: alpha(brand[500], 0.55), flexShrink: 0 }} />
              }
              <Box sx={{ flexGrow: 1 }}>
                <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: pinToHome ? brand[700] : "text.secondary", lineHeight: 1.2 }}>
                  Pin to home
                </Typography>
                <Typography sx={{ fontSize: "0.68rem", color: "text.secondary" }}>
                  Show this deck on your home page
                </Typography>
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={pinToHome}
                    onChange={(e) => { e.stopPropagation(); setPinToHome(e.target.checked); }}
                    sx={{
                      "& .MuiSwitch-switchBase.Mui-checked": { color: brand[600] },
                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: brand[400] },
                    }}
                  />
                }
                label=""
                sx={{ m: 0 }}
                onClick={(e) => e.stopPropagation()}
              />
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
              <Box sx={{ flexGrow: 1, height: "1px", bgcolor: alpha(brand[300], 0.3) }} />
              <Typography sx={{ fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: alpha(brand[700], 0.7), fontFamily: '"Nunito", sans-serif' }}>
                add cards (optional)
              </Typography>
              <Box sx={{ flexGrow: 1, height: "1px", bgcolor: alpha(brand[300], 0.3) }} />
            </Box>

            <Box sx={{ bgcolor: surfaces.input, border: `1.5px solid ${alpha(brand[300], 0.35)}`, borderRadius: "14px", p: 2, mb: 2 }}>
              <Typography sx={{ fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: brand[500], fontFamily: '"Nunito", sans-serif', mb: 1.25 }}>
                Generate with AI
              </Typography>
              <WordChipInput words={words} onWordsChange={setWords} input={input} onInputChange={setInput} disabled={busy} inputId="create-deck-word-input" />
              {error && <Alert severity="error" sx={{ mb: 1.25, fontSize: "0.73rem", py: 0.4, borderRadius: "9px" }}>{error}</Alert>}
              {words.length > 0 && !busy && (
                <Typography sx={{ textAlign: "center", fontSize: "0.67rem", color: "text.secondary", fontFamily: '"Nunito", sans-serif', fontWeight: 600 }}>
                  {words.length} word{words.length > 1 ? "s" : ""} queued
                </Typography>
              )}
            </Box>

            <OrDivider />
            <AddCardOptionButtons disabled={busy || !name.trim()} onAddExisting={handleAddExisting} onImportPdf={handleImportPdf} />
          </DialogContent>
        )}

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} disabled={busy} sx={{ color: "text.secondary", textTransform: "none" }}>Cancel</Button>
          <Button
            onClick={handleCreate} disabled={!name.trim() || busy} variant="contained"
            startIcon={creating ? <CircularProgress size={13} color="inherit" /> : canGenerate ? <AutoAwesomeIcon sx={{ fontSize: 14 }} /> : undefined}
            sx={{
              bgcolor: brand[700], color: "#fff", textTransform: "none", borderRadius: 6, px: 2.5,
              "&:hover": { bgcolor: brand[800] },
              "&:disabled": { bgcolor: alpha(brand[700], 0.2), color: alpha("#fff", 0.5) },
            }}
          >
            {creating ? "Creating…" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <AddExistingCardsDialog open={pickerOpen} onClose={() => { setPickerOpen(false); if (createdDeckId) navigateToDeck(createdDeckId); }}
        targetDeckId={createdDeckId ?? ""} userId={user?.id ?? ""} onConfirm={handlePickerConfirm} />
      <PdfImportModal open={pdfOpen} onClose={() => { setPdfOpen(false); if (createdDeckId) navigateToDeck(createdDeckId); }} onAddCards={() => { setPdfOpen(false); if (createdDeckId) navigateToDeck(createdDeckId); }} />
    </>
  );
}

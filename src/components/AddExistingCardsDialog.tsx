"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  TextField,
  InputAdornment,
  Checkbox,
  Box,
  CircularProgress,
  Divider,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import LibraryAddIcon from "@mui/icons-material/LibraryAdd";
import type { Flashcard } from "@/types/flashcard";
import type { Deck } from "@/types/deck";
import { loadAllCards, loadDecks } from "@/lib/supabase";

interface Props {
  open: boolean;
  onClose: () => void;
  /** The deck we are copying cards INTO — excluded from the source list */
  targetDeckId: string;
  /** Called with the cards the user confirmed — caller does the actual copy */
  onConfirm: (cards: Flashcard[]) => Promise<void>;
}

function CardThumbnail({ card }: { card: Flashcard }) {
  return card.imageUrl ? (
    <Box
      component="img"
      src={card.imageUrl}
      alt={card.word}
      sx={{
        width: 44,
        height: 44,
        borderRadius: '8px',
        objectFit: 'cover',
        flexShrink: 0,
        border: '1px solid rgba(249,168,212,0.3)',
        bgcolor: '#FFF0F8',
      }}
    />
  ) : (
    <Box
      sx={{
        width: 44,
        height: 44,
        borderRadius: '8px',
        flexShrink: 0,
        background: 'linear-gradient(135deg, #FFF0F8 0%, #FAF5FF 100%)',
        border: '1px solid rgba(249,168,212,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.1rem',
      }}
    >
      🌸
    </Box>
  );
}

export function AddExistingCardsDialog({
  open,
  onClose,
  targetDeckId,
  onConfirm,
}: Props) {
  const [allCards, setAllCards] = useState<Flashcard[]>([]);
  const [deckMap, setDeckMap] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelected(new Set());
    setSearch("");

    Promise.all([loadAllCards(), loadDecks()]).then(([cards, decks]) => {
      const foreign = cards.filter((c) => c.deckId !== targetDeckId);
      setAllCards(foreign);

      const map: Record<string, string> = {};
      decks.forEach((d: Deck) => {
        map[d.id] = d.name;
      });
      setDeckMap(map);
      setLoading(false);
    });
  }, [open, targetDeckId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allCards;
    return allCards.filter(
      (c) =>
        c.word.toLowerCase().includes(q) ||
        c.reading.toLowerCase().includes(q) ||
        c.meaning.toLowerCase().includes(q),
    );
  }, [allCards, search]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((c) => c.id)));
    }
  };

  const handleConfirm = async () => {
    const chosenCards = allCards.filter((c) => selected.has(c.id));
    if (chosenCards.length === 0) return;
    setSaving(true);
    await onConfirm(chosenCards);
    setSaving(false);
    onClose();
  };

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((c) => selected.has(c.id));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            bgcolor: "#FFF3F9",
            backgroundImage: "none",
            border: "1px solid rgba(249,168,212,0.45)",
            boxShadow: "0 16px 36px rgba(249,168,212,0.18)",
            borderRadius: 3,
            maxHeight: "80vh",
          },
        },
      }}
    >
      {/* ── Header ── */}
      <DialogTitle
        sx={{ fontFamily: '"DM Serif Display", serif', fontWeight: 400, pb: 0 }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <LibraryAddIcon sx={{ color: "#BE185D", fontSize: 22, mt: "-2px" }} />
          Add Existing Cards
        </Box>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontSize: "0.8rem", mt: 0.25 }}
        >
          Pick cards from your other decks — they'll be copied here
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: "12px !important", px: 2.5 }}>
        {/* ── Search ── */}
        <TextField
          placeholder="Search word, reading, meaning…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
          size="small"
          sx={{ mb: 1.5 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: "text.disabled" }} />
                </InputAdornment>
              ),
            },
          }}
        />

        {/* ── Selection summary + select-all ── */}
        {!loading && filtered.length > 0 && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 0.5,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              {selected.size > 0
                ? `${selected.size} selected`
                : `${filtered.length} card${filtered.length !== 1 ? "s" : ""}`}
            </Typography>
            <Button
              size="small"
              onClick={toggleAll}
              sx={{
                textTransform: "none",
                fontSize: "0.75rem",
                color: "#BE185D",
                p: 0,
                minWidth: 0,
              }}
            >
              {allFilteredSelected ? "Deselect all" : "Select all"}
            </Button>
          </Box>
        )}

        <Divider sx={{ mb: 1, borderColor: "rgba(249,168,212,0.3)" }} />

        {/* ── Card list ── */}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={28} sx={{ color: "#BE185D" }} />
          </Box>
        ) : filtered.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: "center", py: 4 }}
          >
            {allCards.length === 0
              ? "No cards in other decks yet"
              : "No cards match your search"}
          </Typography>
        ) : (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 0.5,
              overflowY: "auto",
              maxHeight: "calc(80vh - 220px)",
              pr: 0.5,
            }}
          >
            {filtered.map((card) => {
              const isChecked = selected.has(card.id);
              return (
                <Box
                  key={card.id}
                  onClick={() => toggle(card.id)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.25,
                    px: 1.25,
                    py: 0.875,
                    borderRadius: 2,
                    cursor: "pointer",
                    border: "1px solid",
                    borderColor: isChecked
                      ? "rgba(190,24,93,0.35)"
                      : "rgba(249,168,212,0.3)",
                    bgcolor: isChecked
                      ? "rgba(190,24,93,0.06)"
                      : "rgba(255,255,255,0.6)",
                    transition: "all 0.15s ease",
                    "&:hover": {
                      bgcolor: isChecked
                        ? "rgba(190,24,93,0.1)"
                        : "rgba(249,168,212,0.12)",
                      borderColor: "rgba(190,24,93,0.25)",
                    },
                  }}
                >
                  <Checkbox
                    checked={isChecked}
                    size="small"
                    disableRipple
                    sx={{
                      p: 0,
                      color: "rgba(190,24,93,0.35)",
                      "&.Mui-checked": { color: "#BE185D" },
                    }}
                  />

                  {/* Thumbnail */}
                  <CardThumbnail card={card} />

                  {/* Word + reading + meaning */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box
                      sx={{ display: "flex", alignItems: "baseline", gap: 0.75 }}
                    >
                      <Typography
                        sx={{
                          fontFamily: '"DM Serif Display", serif',
                          fontSize: "1rem",
                          lineHeight: 1.3,
                          color: "text.primary",
                        }}
                      >
                        {card.word}
                      </Typography>
                      {card.reading && (
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary", fontSize: "0.75rem" }}
                        >
                          {card.reading}
                        </Typography>
                      )}
                    </Box>
                    {card.meaning && (
                      <Typography
                        variant="body2"
                        sx={{
                          color: "text.secondary",
                          fontSize: "0.78rem",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {card.meaning}
                      </Typography>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </DialogContent>

      {/* ── Actions ── */}
      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
        <Button
          onClick={onClose}
          sx={{ color: "text.secondary", textTransform: "none" }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={selected.size === 0 || saving}
          variant="contained"
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
          {saving ? (
            <CircularProgress size={16} sx={{ color: "#FFF0F6", mr: 1 }} />
          ) : null}
          {saving
            ? "Copying…"
            : `Copy ${selected.size > 0 ? selected.size : ""} card${selected.size !== 1 ? "s" : ""}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
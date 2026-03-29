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
} from "@mui/material";
import { useDecks } from "@/hooks/useDecks";
import { useRouter } from "next/navigation";

export function CreateDeckDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { createDeck } = useDecks();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    const deck = await createDeck(name.trim(), description.trim() || undefined);
    setName("");
    setDescription("");
    onClose();
    router.push(`/?deck=${deck.id}`); // FIXME: Make the decks based on url query params instead of global state so this can be more intuitive and less buggy
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
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
        <TextField
          label="Deck Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
          fullWidth
          autoFocus
          sx={{ mb: 2 }}
        />
        <TextField
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
          multiline
          rows={2}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button
          onClick={onClose}
          sx={{ color: "text.secondary", textTransform: "none" }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleCreate}
          disabled={!name.trim()}
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
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}

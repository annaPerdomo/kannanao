"use client";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  TextField,
  Box,
  CircularProgress,
  IconButton,
  Divider,
} from "@mui/material";
import PersonAddAltIcon from "@mui/icons-material/PersonAddAlt";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import IosShareIcon from "@mui/icons-material/IosShare";
import type { DeckShare } from "@/lib/supabase";
import { dbShareDeck, dbGetDeckShares, dbUnShareDeck } from "@/lib/supabase";

interface Props {
  open: boolean;
  onClose: () => void;
  deckId: string;
  deckName: string;
}

export function ShareDeckDialog({ open, onClose, deckId, deckName }: Props) {
  const [username, setUsername] = useState("");
  const [shares, setShares] = useState<DeckShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setUsername("");
    setError(null);
    setLoading(true);
    dbGetDeckShares(deckId).then((s) => {
      setShares(s);
      setLoading(false);
    });
  }, [open, deckId]);

  const handleShare = async () => {
    if (!username.trim()) return;
    setSharing(true);
    setError(null);
    const { error } = await dbShareDeck(deckId, username);
    if (error) {
      setError(error);
      setSharing(false);
      return;
    }
    // Refetch shares to get the new entry
    const updated = await dbGetDeckShares(deckId);
    setShares(updated);
    setUsername("");
    setSharing(false);
  };

  const handleRemove = async (shareId: string) => {
    setShares((prev) => prev.filter((s) => s.id !== shareId));
    await dbUnShareDeck(shareId);
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
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IosShareIcon sx={{ color: "#7c3aed", fontSize: 20, mt: "-2px" }} />
          Share Deck
        </Box>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontSize: "0.8rem", mt: 0.25 }}
        >
          {deckName}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: "16px !important", px: 2.5 }}>
        {/* Share input row */}
        <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
          <TextField
            placeholder="Username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => { if (e.key === "Enter") handleShare(); }}
            size="small"
            fullWidth
            disabled={sharing}
          />
          <Button
            onClick={handleShare}
            disabled={sharing || !username.trim()}
            variant="contained"
            sx={{
              bgcolor: "#7c3aed",
              color: "#fff",
              textTransform: "none",
              borderRadius: 6,
              whiteSpace: "nowrap",
              flexShrink: 0,
              "&:hover": { bgcolor: "#6d28d9" },
              "&:disabled": { bgcolor: "rgba(124,58,237,0.25)" },
            }}
            startIcon={
              sharing ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <PersonAddAltIcon fontSize="small" />
              )
            }
          >
            Share
          </Button>
        </Box>

        {error && (
          <Typography
            variant="caption"
            sx={{ color: "#dc2626", mt: 0.75, display: "block" }}
          >
            {error}
          </Typography>
        )}

        <Divider sx={{ my: 2, borderColor: "rgba(249,168,212,0.3)" }} />

        {/* Current shares */}
        <Typography
          variant="caption"
          sx={{ color: "text.secondary", mb: 1, display: "block" }}
        >
          Shared with
        </Typography>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <CircularProgress size={22} sx={{ color: "#7c3aed" }} />
          </Box>
        ) : shares.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: "center", py: 2, fontSize: "0.82rem" }}
          >
            Not shared with anyone yet
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            {shares.map((share) => (
              <Box
                key={share.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 2,
                  bgcolor: "rgba(237,233,254,0.5)",
                  border: "1px solid rgba(167,139,250,0.3)",
                }}
              >
                <Typography
                  sx={{
                    fontFamily: '"DM Serif Display", serif',
                    fontSize: "0.95rem",
                    color: "text.primary",
                  }}
                >
                  {share.username}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => handleRemove(share.id)}
                  aria-label="Remove share"
                  sx={{
                    color: "rgba(220,38,38,0.5)",
                    "&:hover": { color: "#dc2626", bgcolor: "rgba(220,38,38,0.08)" },
                  }}
                >
                  <PersonRemoveIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 0.5 }}>
        <Button
          onClick={onClose}
          sx={{ color: "text.secondary", textTransform: "none" }}
        >
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}

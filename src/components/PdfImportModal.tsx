import { useState, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Divider,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import type { GeneratedCard } from "@/types/flashcard";
import { Loading } from "@/components/Loading";

const EXTRACTED_FIELDS = ["word", "reading", "meaning", "example sentence in Japanese", "example sentence in English", "JLPT level"];

interface PdfImportModalProps {
  open: boolean;
  onClose: () => void;
  onAddCards: (cards: GeneratedCard[]) => void | Promise<void>;
}

export function PdfImportModal({
  open,
  onClose,
  onAddCards,
}: PdfImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<GeneratedCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (f.type !== "application/pdf") {
      setError("Please upload a PDF file.");
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      setError("File must be under 20 MB.");
      return;
    }
    setFile(f);
    setExtracted(null);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const toBase64 = (f: File): Promise<string> =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res((r.result as string).split(",")[1]);
      r.onerror = () => rej(new Error("Read failed"));
      r.readAsDataURL(f);
    });

  const handleExtract = async () => {
    if (!file) return;
    setExtracting(true);
    setError(null);
    setExtracted(null);

    try {
      const pdfBase64 = await toBase64(file);

      const response = await fetch("/api/pdf-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfBase64 }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Extraction failed");
      }

      setExtracted(data as GeneratedCard[]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to extract cards. Please check the PDF and try again.",
      );
    } finally {
      setExtracting(false);
    }
  };

  const handleAdd = () => {
    if (extracted) {
      onAddCards(extracted);
      onClose();
      setFile(null);
      setExtracted(null);
    }
  };

  const handleClose = () => {
    onClose();
    setFile(null);
    setExtracted(null);
    setError(null);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: "14px", p: 0.5 } }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 0.5,
        }}
      >
        <Typography variant="subtitle1" fontWeight={700} fontSize="0.88rem">
          Import cards from PDF
        </Typography>
        <IconButton size="small" onClick={handleClose}>
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pb: 0, pt: 1,}}>
        {extracting ? (
          <Loading message="Extracting cards…" />
        ) : (
          <>
            {/* Drop zone */}
            <Box
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              sx={{
                border: dragging ? "1.5px dashed #f9a8d4" : "1.5px dashed",
                borderColor: dragging ? "#f9a8d4" : "divider",
                borderRadius: "10px",
                p: 2.5,
                textAlign: "center",
                cursor: "pointer",
                mb: 2,
                bgcolor: file
                  ? "rgba(249,168,212,0.06)"
                  : dragging
                    ? "rgba(249,168,212,0.08)"
                    : "background.default",
                transition: "all 0.15s",
              }}
            >
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFile(e.target.files[0]);
                }}
              />
              {file ? (
                <>
                  <CheckCircleOutlineIcon
                    sx={{ color: "#ec4899", fontSize: 22, mb: 0.5 }}
                  />
                  <Typography fontSize="0.78rem" fontWeight={700}>
                    {file.name}
                  </Typography>
                  <Typography fontSize="0.71rem" color="text.secondary">
                    {(file.size / 1024).toFixed(0)} KB · Click to replace
                  </Typography>
                </>
              ) : (
                <>
                  <UploadFileIcon
                    sx={{ color: "rgba(236,72,153,0.5)", fontSize: 28, mb: 0.75 }}
                  />
                  <Typography fontSize="0.78rem" fontWeight={700}>
                    Drop a PDF here
                  </Typography>
                  <Typography fontSize="0.71rem" color="text.secondary">
                    or click to browse · PDF only · max 20 MB
                  </Typography>
                </>
              )}
            </Box>

            {/* Extracting fields preview */}
            <Box sx={{ mb: 1.5 }}>
              <Typography
                fontSize="0.68rem"
                color="text.disabled"
                sx={{ mb: 0.75 }}
              >
                Fields extracted
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {EXTRACTED_FIELDS.map((f) => (
                  <Box
                    key={f}
                    sx={{
                      px: 1,
                      py: 0.25,
                      borderRadius: "20px",
                      border: "1px solid",
                      borderColor: "rgba(236,72,153,0.25)",
                      bgcolor: "rgba(236,72,153,0.05)",
                    }}
                  >
                    <Typography fontSize="0.68rem" color="text.secondary">
                      {f}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            {error && (
              <Alert severity="error" sx={{ fontSize: "0.74rem", mb: 1.5 }}>
                {error}
              </Alert>
            )}

            {/* Preview extracted cards */}
            {extracted && (
              <Box>
                <Divider sx={{ mb: 1.5 }} />
                <Typography
                  fontSize="0.7rem"
                  fontWeight={700}
                  color="text.secondary"
                  sx={{
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    mb: 1,
                  }}
                >
                  {extracted.length} cards extracted
                </Typography>
                <Box
                  sx={{
                    maxHeight: 180,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.5,
                  }}
                >
                  {extracted.slice(0, 20).map((card, i) => (
                    <Box
                      key={i}
                      sx={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 1,
                        p: "5px 8px",
                        bgcolor: "background.default",
                        borderRadius: "7px",
                        border: "0.5px solid",
                        borderColor: "divider",
                      }}
                    >
                      <Typography
                        fontSize="0.78rem"
                        fontWeight={700}
                        sx={{ minWidth: 60 }}
                      >
                        {card.word}
                      </Typography>
                      <Typography
                        fontSize="0.7rem"
                        color="text.secondary"
                        sx={{ minWidth: 60 }}
                      >
                        {card.reading}
                      </Typography>
                      <Typography
                        fontSize="0.7rem"
                        color="text.secondary"
                        noWrap
                      >
                        {card.meaning}
                      </Typography>
                    </Box>
                  ))}
                  {extracted.length > 20 && (
                    <Typography
                      fontSize="0.7rem"
                      color="text.secondary"
                      textAlign="center"
                    >
                      +{extracted.length - 20} more cards
                    </Typography>
                  )}
                </Box>
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2.5, pb: 2, gap: 1 }}>
        {!extracted ? (
          <Button
            fullWidth
            variant="contained"
            disabled={!file || extracting}
            onClick={handleExtract}
            sx={{
              bgcolor: "#ec4899",
              borderRadius: "9px",
              textTransform: "none",
              fontWeight: 700,
              fontSize: "0.76rem",
              "&:hover": { bgcolor: "#db2777" },
            }}
          >
            Extract cards
          </Button>
        ) : (
          <>
            <Button
              size="small"
              onClick={() => setExtracted(null)}
              sx={{ textTransform: "none", fontSize: "0.74rem" }}
            >
              Re-extract
            </Button>
            <Button
              variant="contained"
              onClick={handleAdd}
              sx={{
                bgcolor: "#ec4899",
                borderRadius: "9px",
                textTransform: "none",
                fontWeight: 700,
                fontSize: "0.76rem",
                flex: 1,
                "&:hover": { bgcolor: "#db2777" },
              }}
            >
              Add {extracted.length} cards to deck
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

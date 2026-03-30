import { useState, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Chip,
  IconButton,
  Divider,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

const FORMAT_PRESETS = [
  {
    id: "adventures-in-japanese-1",
    label: "Adventures in Japanese 1 Vocabulary List",
    description: "Word · reading · meaning",
    fields: ["word", "reading", "definition"],
    prompt: `Extract all Japanese vocabulary entries from this PDF. 
For each entry return JSON: { "word": "<Japanese>", "reading": "<furigana/romaji>", "definition": "<English meaning>" }.
Return ONLY a JSON array, no markdown.`,
  },
];

interface ExtractedCard {
  word: string;
  reading: string;
  definition: string;
  level?: string;
}

interface PdfImportModalProps {
  open: boolean;
  onClose: () => void;
  onAddCards: (cards: ExtractedCard[]) => void;
}

export function PdfImportModal({
  open,
  onClose,
  onAddCards,
}: PdfImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [selectedFormat, setSelectedFormat] = useState(FORMAT_PRESETS[0].id);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const preset = FORMAT_PRESETS.find((p) => p.id === selectedFormat)!;

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
    console.log("WIP");
    // if (!file) return;
    // setExtracting(true);
    // setError(null);
    // setExtracted(null);

    // try {
    //   const base64Data = await toBase64(file);

    //   const response = await fetch("https://api.anthropic.com/v1/messages", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({
    //       model: "claude-sonnet-4-20250514",
    //       max_tokens: 4096,
    //       messages: [
    //         {
    //           role: "user",
    //           content: [
    //             {
    //               type: "document",
    //               source: {
    //                 type: "base64",
    //                 media_type: "application/pdf",
    //                 data: base64Data,
    //               },
    //             },
    //             { type: "text", text: preset.prompt },
    //           ],
    //         },
    //       ],
    //     }),
    //   });

    //   const data = await response.json();
    //   const text = data.content
    //     .map((b: { type: string; text?: string }) => (b.type === "text" ? b.text : ""))
    //     .join("");

    //   const clean = text.replace(/```json|```/g, "").trim();
    //   const cards: ExtractedCard[] = JSON.parse(clean);
    //   setExtracted(cards);
    // } catch (err) {
    //   setError("Failed to extract cards. Please check the PDF and try again.");
    // } finally {
    //   setExtracting(false);
    // }
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

      <DialogContent sx={{ pt: 1 }}>
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
                sx={{ color: "text.secondary", fontSize: 22, mb: 0.5 }}
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

        {/* Format presets */}
        <Typography
          fontSize="0.7rem"
          fontWeight={700}
          color="text.secondary"
          sx={{ textTransform: "uppercase", letterSpacing: "0.05em", mb: 1 }}
        >
          Format preset
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 0.75,
            mb: 1.5,
          }}
        >
          {FORMAT_PRESETS.map((p) => (
            <Box
              key={p.id}
              onClick={() => setSelectedFormat(p.id)}
              sx={{
                border:
                  selectedFormat === p.id ? "2px solid #f9a8d4" : "0.5px solid",
                borderColor: selectedFormat === p.id ? "#f9a8d4" : "divider",
                borderRadius: "9px",
                p: "8px 10px",
                cursor: "pointer",
                bgcolor:
                  selectedFormat === p.id
                    ? "rgba(249,168,212,0.08)"
                    : "transparent",
                gridColumn: p.id === "auto" ? "span 2" : "span 1",
                transition: "all 0.12s",
              }}
            >
              <Typography
                fontSize="0.72rem"
                fontWeight={700}
                color={selectedFormat === p.id ? "#9d174d" : "text.primary"}
              >
                {p.label}
              </Typography>
              <Typography
                fontSize="0.68rem"
                color={selectedFormat === p.id ? "#be185d" : "text.secondary"}
              >
                {p.description}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Extracting fields preview */}
        <Box
          sx={{
            bgcolor: "rgba(249,168,212,0.08)",
            borderRadius: "9px",
            p: "8px 10px",
            mb: 1.5,
            border: "0.5px solid rgba(249,168,212,0.3)",
          }}
        >
          <Typography fontSize="0.69rem" color="#9d174d">
            Extracting:{" "}
            {preset.fields.map((f, i) => (
              <span key={f}>
                <strong>{f}</strong>
                {i < preset.fields.length - 1 ? " · " : ""}
              </span>
            ))}
          </Typography>
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
                  <Typography fontSize="0.7rem" color="text.secondary" noWrap>
                    {card.definition}
                  </Typography>
                  {card.level && (
                    <Chip
                      label={card.level}
                      size="small"
                      sx={{ fontSize: "0.6rem", height: 16, ml: "auto" }}
                    />
                  )}
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
            {extracting ? (
              <>
                <CircularProgress size={12} sx={{ mr: 1, color: "white" }} />{" "}
                Extracting…
              </>
            ) : (
              "Extract cards"
            )}
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

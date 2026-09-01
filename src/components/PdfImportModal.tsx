import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { Alert, Box, Button, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';

import { Loading } from '@/components/Loading';
import { DOCUMENT_MAX_BYTES } from '@/components/MaterialsBuilder/constants';
import { StyledDialog } from '@/components/StyledDialog';
import { errorMessage } from '@/lib/errorMessage';
import { sb } from '@/lib/supabase';
import { uploadLessonDocument } from '@/services/api';
import type { GeneratedCard } from '@/types/flashcard';

interface PdfImportModalProps {
  open: boolean;
  onClose: () => void;
  onAddCards: (cards: GeneratedCard[]) => void | Promise<void>;
}

export function PdfImportModal({ open, onClose, onAddCards }: PdfImportModalProps) {
  const t = useTranslations('Deck.pdfImportModal');
  const EXTRACTED_FIELDS = t.raw('extractedFields') as string[];
  const { palette } = useTheme();
  const { brand, accent } = palette;

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (f.type !== 'application/pdf') {
      setError(t('pleaseUploadPdf'));
      return;
    }
    if (f.size > DOCUMENT_MAX_BYTES) {
      setError(t('fileSizeError'));
      return;
    }
    setFile(f);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  // Extraction runs straight into the hand-off. There used to be a preview list
  // with its own "Add N cards" button here, which meant confirming the same
  // import twice — once against a cramped read-only list, then again in the
  // Review Cards step that can actually edit them. Only the second one earns
  // its place, so this modal just does the work and gets out of the way.
  const handleExtract = async () => {
    if (!file) return;
    setError(null);

    // The PDF goes browser → Storage; only its object key is posted here, which
    // is what keeps a big file clear of Vercel's ~4.5 MB request body limit.
    let path: string;
    setUploading(true);
    try {
      path = await uploadLessonDocument(file);
    } catch {
      setError(t('uploadFailedError'));
      return;
    } finally {
      setUploading(false);
    }

    let cards: GeneratedCard[];
    setExtracting(true);
    try {
      const { data: sessionData } = await sb.auth.getSession();
      const token = sessionData.session?.access_token;
      const response = await fetch('/api/pdf-extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ path }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? t('extractionFailedFallback'));
      cards = data as GeneratedCard[];
    } catch (err) {
      setError(errorMessage(err, t('extractFailedGeneric')));
      return;
    } finally {
      setExtracting(false);
    }

    if (cards.length === 0) {
      setError(t('noCardsFound'));
      return;
    }

    // The parent still has to fetch a photo per card before the review step can
    // open, so stay up and keep the spinner honest rather than closing early.
    setAdding(true);
    try {
      await onAddCards(cards);
      setFile(null);
    } catch (err) {
      setError(errorMessage(err, t('extractFailedGeneric')));
    } finally {
      setAdding(false);
    }
  };

  const handleClose = () => {
    onClose();
    setFile(null);
    setError(null);
  };

  return (
    <StyledDialog
      open={open}
      onClose={handleClose}
      title={t('title')}
      subtitle={t('subtitle')}
      maxWidth="sm"
      closeDisabled={uploading || extracting || adding}
      actions={
        <Button
          fullWidth
          variant="contained"
          disabled={!file || uploading || extracting || adding}
          onClick={handleExtract}
          sx={{
            background: `linear-gradient(135deg, ${brand[400]}, ${accent[300]})`,
            borderRadius: '10px',
            textTransform: 'none',
            fontWeight: 700,
            fontSize: '0.76rem',
            '&:hover': { background: `linear-gradient(135deg, ${brand[500]}, ${accent[400]})` },
          }}
        >
          {t('extractCards')}
        </Button>
      }
    >
      {uploading || extracting || adding ? (
        <Loading
          message={adding ? t('addingCards') : uploading ? t('uploadingPdf') : t('extracting')}
        />
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
              border: `1.5px dashed ${dragging ? brand[300] : alpha(brand[300], 0.4)}`,
              borderRadius: 3,
              p: 2.5,
              textAlign: 'center',
              cursor: 'pointer',
              mb: 2,
              bgcolor: file
                ? alpha(brand[100], 0.3)
                : dragging
                  ? alpha(brand[100], 0.2)
                  : 'background.default',
              transition: 'all 0.15s',
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files?.[0]) handleFile(e.target.files[0]);
              }}
            />
            {file ? (
              <>
                <CheckCircleOutlineIcon sx={{ color: brand[500], fontSize: 22, mb: 0.5 }} />
                <Typography fontSize="0.78rem" fontWeight={700}>
                  {file.name}
                </Typography>
                <Typography fontSize="0.71rem" color="text.secondary">
                  {t('clickToReplace', { size: (file.size / 1024).toFixed(0) })}
                </Typography>
              </>
            ) : (
              <>
                <UploadFileIcon sx={{ color: alpha(brand[500], 0.5), fontSize: 28, mb: 0.75 }} />
                <Typography fontSize="0.78rem" fontWeight={700}>
                  {t('dropPdfHere')}
                </Typography>
                <Typography fontSize="0.71rem" color="text.secondary">
                  {t('orClickToBrowse')}
                </Typography>
              </>
            )}
          </Box>

          {/* Extracting fields preview */}
          <Box sx={{ mb: 1.5 }}>
            <Typography fontSize="0.68rem" color="text.disabled" sx={{ mb: 0.75 }}>
              {t('fieldsExtracted')}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {EXTRACTED_FIELDS.map((f) => (
                <Box
                  key={f}
                  sx={{
                    px: 1,
                    py: 0.25,
                    borderRadius: (theme) => theme.radii.md,
                    border: `1px solid ${alpha(brand[300], 0.25)}`,
                    bgcolor: alpha(brand[100], 0.2),
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
            <Alert severity="error" sx={{ fontSize: '0.74rem', mb: 1.5 }}>
              {error}
            </Alert>
          )}
        </>
      )}
    </StyledDialog>
  );
}

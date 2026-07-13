import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { Alert, Box, Button, Divider, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';

import { Loading } from '@/components/Loading';
import { StyledDialog } from '@/components/StyledDialog';
import { sb } from '@/lib/supabase';
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
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<GeneratedCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (f.type !== 'application/pdf') {
      setError(t('pleaseUploadPdf'));
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      setError(t('fileSizeError'));
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
      r.onload = () => res((r.result as string).split(',')[1]);
      r.onerror = () => rej(new Error(t('readFailedError')));
      r.readAsDataURL(f);
    });

  const handleExtract = async () => {
    if (!file) return;
    setExtracting(true);
    setError(null);
    setExtracted(null);
    try {
      const pdfBase64 = await toBase64(file);
      const { data: sessionData } = await sb.auth.getSession();
      const token = sessionData.session?.access_token;
      const response = await fetch('/api/pdf-extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ pdfBase64 }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? t('extractionFailedFallback'));
      setExtracted(data as GeneratedCard[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('extractFailedGeneric'));
    } finally {
      setExtracting(false);
    }
  };

  const handleAdd = () => {
    if (extracted) {
      onAddCards(extracted);
      handleClose();
    }
  };

  const handleClose = () => {
    onClose();
    setFile(null);
    setExtracted(null);
    setError(null);
  };

  return (
    <StyledDialog
      open={open}
      onClose={handleClose}
      title={t('title')}
      subtitle={t('subtitle')}
      maxWidth="sm"
      closeDisabled={extracting}
      actions={
        !extracted ? (
          <Button
            fullWidth
            variant="contained"
            disabled={!file || extracting}
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
        ) : (
          <>
            <Button
              size="small"
              onClick={() => setExtracted(null)}
              sx={{ textTransform: 'none', fontSize: '0.74rem' }}
            >
              {t('reExtract')}
            </Button>
            <Button
              variant="contained"
              onClick={handleAdd}
              sx={{
                background: `linear-gradient(135deg, ${brand[400]}, ${accent[300]})`,
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.76rem',
                flex: 1,
                '&:hover': { background: `linear-gradient(135deg, ${brand[500]}, ${accent[400]})` },
              }}
            >
              {t('addCardsToDeck', { count: extracted.length })}
            </Button>
          </>
        )
      }
    >
      {extracting ? (
        <Loading message={t('extracting')} />
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
                    borderRadius: '20px',
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

          {extracted && (
            <Box>
              <Divider sx={{ mb: 1.5 }} />
              <Typography
                fontSize="0.7rem"
                fontWeight={700}
                color="text.secondary"
                sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1 }}
              >
                {t('cardsExtractedCount', { count: extracted.length })}
              </Typography>
              <Box
                sx={{
                  maxHeight: 180,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5,
                }}
              >
                {extracted.slice(0, 20).map((card, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 1,
                      p: '5px 8px',
                      bgcolor: 'background.default',
                      borderRadius: '7px',
                      border: '0.5px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography fontSize="0.78rem" fontWeight={700} sx={{ minWidth: 60 }}>
                      {card.word}
                    </Typography>
                    <Typography fontSize="0.7rem" color="text.secondary" sx={{ minWidth: 60 }}>
                      {card.reading}
                    </Typography>
                    <Typography fontSize="0.7rem" color="text.secondary" noWrap>
                      {card.meaning}
                    </Typography>
                  </Box>
                ))}
                {extracted.length > 20 && (
                  <Typography fontSize="0.7rem" color="text.secondary" textAlign="center">
                    {t('moreCards', { count: extracted.length - 20 })}
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </>
      )}
    </StyledDialog>
  );
}

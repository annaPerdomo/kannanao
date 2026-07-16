'use client';
import AddIcon from '@mui/icons-material/Add';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';

import { Loading } from '@/components/Loading';
import { formatFurigana } from '@/services/api';

interface BulkImportAreaProps {
  brandPalette: Record<number, string>;
  onImport: (texts: string[]) => Promise<void>;
}

export function BulkImportArea({ brandPalette, onImport }: BulkImportAreaProps) {
  const t = useTranslations('Ohanashikai.bulkImport');
  const [pasteText, setPasteText] = useState('');
  const [importing, setImporting] = useState(false);
  const [addingFurigana, setAddingFurigana] = useState(false);
  const [furiganaError, setFuriganaError] = useState<string | null>(null);

  const handleAddFurigana = useCallback(async () => {
    const rawLines = pasteText
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean);
    if (rawLines.length === 0) return;
    setAddingFurigana(true);
    setFuriganaError(null);
    try {
      const formatted = await formatFurigana(rawLines);
      setPasteText(formatted.join('\n'));
    } catch (err) {
      setFuriganaError(err instanceof Error ? err.message : t('genericError'));
    } finally {
      setAddingFurigana(false);
    }
  }, [pasteText]);

  const handleImport = useCallback(async () => {
    const texts = pasteText
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean);
    if (texts.length === 0) return;
    setImporting(true);
    try {
      await onImport(texts);
      setPasteText('');
    } finally {
      setImporting(false);
    }
  }, [pasteText, onImport]);

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2.5,
        border: `1.5px dashed ${alpha(brandPalette[300], 0.45)}`,
        bgcolor: alpha(brandPalette[50], 0.5),
      }}
    >
      <Box
        sx={{
          mb: 1.5,
          p: 1.5,
          borderRadius: 2,
          bgcolor: alpha(brandPalette[100], 0.5),
          border: `1px solid ${alpha(brandPalette[300], 0.3)}`,
        }}
      >
        <Typography
          sx={{ fontSize: '0.72rem', fontWeight: 800, color: brandPalette[700], mb: 0.5 }}
        >
          {t('howToTitle')}
        </Typography>
        <Typography sx={{ fontSize: '0.7rem', color: brandPalette[600], lineHeight: 1.6 }}>
          {t.rich('option1', {
            strong: (chunks) => <strong>{chunks}</strong>,
            em: (chunks) => <em>{chunks}</em>,
          })}
        </Typography>
        <Typography
          sx={{ fontSize: '0.7rem', color: brandPalette[600], lineHeight: 1.6, mt: 0.25 }}
        >
          {t.rich('option2', {
            strong: (chunks) => <strong>{chunks}</strong>,
            kanjiReadingCode: () => (
              <code
                style={{
                  background: alpha(brandPalette[200], 0.5),
                  padding: '0 3px',
                  borderRadius: 3,
                }}
              >
                {'{kanji|reading}'}
              </code>
            ),
            exampleCode: () => (
              <code
                style={{
                  background: alpha(brandPalette[200], 0.5),
                  padding: '0 3px',
                  borderRadius: 3,
                }}
              >
                {'{私|わたし}'}
              </code>
            ),
          })}
        </Typography>
      </Box>

      <Box sx={{ position: 'relative' }}>
        {addingFurigana && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 10,
              borderRadius: 2,
              bgcolor: alpha('#FFFFFF', 0.75),
              backdropFilter: 'blur(2px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Loading message={t('addingFurigana')} />
          </Box>
        )}
        <TextField
          value={pasteText}
          onChange={(e) => {
            setPasteText(e.target.value);
            setFuriganaError(null);
          }}
          placeholder={t('pastePlaceholder')}
          fullWidth
          multiline
          minRows={6}
          maxRows={16}
          autoFocus
          sx={{
            mb: 1,
            '& .MuiOutlinedInput-root': { fontFamily: (t) => t.fonts.jp, fontSize: '0.95rem' },
          }}
        />
      </Box>

      {furiganaError && (
        <Alert
          severity="error"
          onClose={() => setFuriganaError(null)}
          sx={{ mb: 1, borderRadius: 2, fontSize: '0.75rem' }}
        >
          {t('autoFuriganaFailed', { error: furiganaError })}
        </Alert>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {t('linesDetected', {
            count: pasteText.split('\n').filter((l) => l.trim()).length,
          })}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            startIcon={
              addingFurigana ? (
                <CircularProgress size={12} />
              ) : (
                <AutoFixHighIcon sx={{ fontSize: 14 }} />
              )
            }
            onClick={handleAddFurigana}
            disabled={addingFurigana || importing || !pasteText.trim()}
            sx={{ borderRadius: '10px', px: 2, fontSize: '0.72rem', fontWeight: 700 }}
          >
            {addingFurigana ? t('addingFurigana') : t('autoFurigana')}
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={
              importing ? (
                <CircularProgress size={12} sx={{ color: '#fff' }} />
              ) : (
                <AddIcon sx={{ fontSize: 14 }} />
              )
            }
            onClick={handleImport}
            disabled={importing || addingFurigana || !pasteText.trim()}
            sx={{ borderRadius: '10px', px: 2 }}
          >
            {importing ? t('importing') : t('addLines')}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}

'use client';

import AutorenewIcon from '@mui/icons-material/Autorenew';
import { Alert, Box, Button, CircularProgress, TextField, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { type KeyboardEvent, useState } from 'react';

interface RegenerateBarProps {
  selectedCount: number;
  busy: boolean;
  error: string | null;
  onRegenerate: (instruction: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  allSelected: boolean;
}

export function RegenerateBar({
  selectedCount,
  busy,
  error,
  onRegenerate,
  onSelectAll,
  onClearSelection,
  allSelected,
}: RegenerateBarProps) {
  const t = useTranslations('Deck.reviewCardsDialog.regenerate');
  const { palette } = useTheme();
  const { brand } = palette;
  const [instruction, setInstruction] = useState('');

  const canSubmit = !busy && selectedCount > 0 && instruction.trim().length > 0;

  const submit = () => {
    if (!canSubmit) return;
    onRegenerate(instruction.trim());
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    submit();
  };

  return (
    <Box
      sx={{
        px: 2.5,
        py: 1.5,
        borderTop: `1.5px solid ${alpha(brand[300], 0.2)}`,
        bgcolor: alpha(brand[100], 0.35),
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 800, color: brand[700] }}>
          {t('selectedCount', { count: selectedCount })}
        </Typography>
        <Button
          size="small"
          onClick={allSelected ? onClearSelection : onSelectAll}
          disabled={busy}
          sx={{
            minWidth: 0,
            px: 0.75,
            fontSize: '0.68rem',
            fontWeight: 700,
            textTransform: 'none',
            color: brand[600],
          }}
        >
          {allSelected ? t('clearSelection') : t('selectAll')}
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'stretch' }}>
        <TextField
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('placeholder')}
          size="small"
          disabled={busy}
          slotProps={{ htmlInput: { maxLength: 300, 'aria-label': t('placeholder') } }}
          sx={{
            flexGrow: 1,
            '& .MuiOutlinedInput-root': {
              bgcolor: '#fff',
              borderRadius: '10px',
              fontSize: '0.8rem',
              '& fieldset': { borderColor: alpha(brand[300], 0.5), borderWidth: '1.5px' },
              '&.Mui-focused fieldset': { borderColor: brand[400], borderWidth: '1.5px' },
            },
            '& input': { py: '8px' },
          }}
        />
        <Button
          variant="contained"
          onClick={submit}
          disabled={!canSubmit}
          startIcon={
            busy ? (
              <CircularProgress size={13} thickness={5} color="inherit" />
            ) : (
              <AutorenewIcon sx={{ fontSize: 15 }} />
            )
          }
          sx={{
            flexShrink: 0,
            px: 1.75,
            borderRadius: '10px',
            fontWeight: 800,
            fontSize: '0.76rem',
            textTransform: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {busy ? t('regenerating') : t('regenerate', { count: selectedCount })}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 1, fontSize: '0.72rem', py: 0.25, borderRadius: '9px' }}>
          {error}
        </Alert>
      )}
    </Box>
  );
}

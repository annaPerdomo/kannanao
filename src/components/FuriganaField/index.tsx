'use client';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import type { SxProps, Theme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { FuriganaEditor } from '@/components/FuriganaEditor';
import FuriganaText from '@/components/FuriganaText';

export interface FuriganaFieldProps {
  value: string;
  onChange: (markup: string) => void;
  label: string;
  disabled?: boolean;
  autoFill?: boolean;
  emptyText?: string;
  sx?: SxProps<Theme>;
}

export function FuriganaField({
  value,
  onChange,
  label,
  disabled,
  autoFill,
  emptyText,
  sx,
}: FuriganaFieldProps) {
  const t = useTranslations('FuriganaEditor');
  const [editing, setEditing] = useState(false);
  const [priorValue, setPriorValue] = useState(value);

  const startEdit = () => {
    if (disabled) return;
    setPriorValue(value);
    setEditing(true);
  };

  const cancel = () => {
    onChange(priorValue);
    setEditing(false);
  };

  const done = () => setEditing(false);

  if (editing) {
    return (
      <Box
        sx={sx}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && !e.nativeEvent.isComposing) cancel();
        }}
      >
        <FuriganaEditor
          value={value}
          onChange={onChange}
          label={label}
          autoFill={autoFill}
          disabled={disabled}
          autoFocus
        />
        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 1.5 }}>
          <Button onClick={cancel} disabled={disabled}>
            {t('cancel')}
          </Button>
          <Button variant="contained" onClick={done} disabled={disabled}>
            {t('done')}
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={sx}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Stack direction="row" alignItems="center" spacing={1}>
        {value ? (
          <Box
            role={disabled ? undefined : 'button'}
            tabIndex={disabled ? undefined : 0}
            onClick={startEdit}
            onKeyDown={(e) => {
              if (disabled) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                startEdit();
              }
            }}
            sx={{ cursor: disabled ? 'default' : 'pointer', flexGrow: 1 }}
          >
            <FuriganaText text={value} showFurigana />
          </Box>
        ) : (
          <Typography color="text.secondary" sx={{ flexGrow: 1 }}>
            {emptyText ?? t('empty')}
          </Typography>
        )}
        <IconButton aria-label={t('edit')} onClick={startEdit} disabled={disabled} size="small">
          <EditRoundedIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Box>
  );
}

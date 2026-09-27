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

import { frameSx, FuriganaEditor, type FuriganaSize, SIZES } from '@/components/FuriganaEditor';
import FuriganaText from '@/components/FuriganaText';

const ACTION_SX = { fontSize: '0.8rem', px: 1.75, py: 0.5, minWidth: 0 } as const;

export interface FuriganaFieldProps {
  value: string;
  onChange: (markup: string) => void;
  label: string;
  disabled?: boolean;
  autoFill?: boolean;
  emptyText?: string;
  size?: FuriganaSize;
  sx?: SxProps<Theme>;
}

export function FuriganaField({
  value,
  onChange,
  label,
  disabled,
  autoFill,
  emptyText,
  size = 'medium',
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

  if (editing) {
    return (
      <Box
        sx={sx}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && !e.nativeEvent.isComposing) {
            e.stopPropagation();
            cancel();
          }
        }}
      >
        <FuriganaEditor
          value={value}
          onChange={onChange}
          label={label}
          autoFill={autoFill}
          disabled={disabled}
          size={size}
          autoFocus
          actions={
            <>
              <Button size="small" onClick={cancel} disabled={disabled} sx={ACTION_SX}>
                {t('cancel')}
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={() => setEditing(false)}
                disabled={disabled}
                sx={ACTION_SX}
              >
                {t('done')}
              </Button>
            </>
          }
        />
      </Box>
    );
  }

  return (
    <Box
      component="fieldset"
      sx={[
        frameSx(size),
        (theme) => ({
          cursor: disabled ? 'default' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          '&:hover': disabled ? {} : { borderColor: theme.palette.brand[400] },
          '&:focus-within': { borderColor: theme.palette.brand[400] },
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <legend>{label}</legend>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Box
          role={disabled ? undefined : 'button'}
          tabIndex={disabled ? undefined : 0}
          aria-label={disabled ? undefined : `${t('edit')}: ${label}`}
          onClick={startEdit}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              startEdit();
            }
          }}
          sx={{ flexGrow: 1, minWidth: 0, outline: 'none' }}
        >
          {value ? (
            <FuriganaText
              text={value}
              showFurigana
              sx={{ fontSize: SIZES[size].text, fontWeight: 600, lineHeight: 2.3 }}
            />
          ) : (
            <Typography
              color="text.secondary"
              sx={{ fontSize: SIZES[size].text, lineHeight: 2.2, fontStyle: 'italic' }}
            >
              {emptyText ?? t('empty')}
            </Typography>
          )}
        </Box>
        <IconButton
          aria-label={t('edit')}
          onClick={startEdit}
          disabled={disabled}
          size="small"
          sx={{ color: 'brand.500' }}
        >
          <EditRoundedIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Box>
  );
}

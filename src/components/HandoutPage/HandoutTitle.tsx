'use client';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

const NAME_MAX = 200;

interface HandoutTitleProps {
  name: string;
  emoji: string | null;
  statusLabel: string;
  statusColor: string;
  onRename?: (name: string) => Promise<boolean>;
}

export function HandoutTitle({
  name,
  emoji,
  statusLabel,
  statusColor,
  onRename,
}: HandoutTitleProps) {
  const t = useTranslations('Materials.handoutPage');
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);

  const start = () => {
    setValue(name);
    setEditing(true);
  };

  const commit = async () => {
    const next = value.trim();
    if (!next || !onRename) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const ok = await onRename(next);
    setSaving(false);
    if (ok) setEditing(false);
  };

  if (editing) {
    return (
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mt: 0.5 }}>
        <TextField
          autoFocus
          size="small"
          value={value}
          disabled={saving}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void commit();
            if (e.key === 'Escape') setEditing(false);
          }}
          slotProps={{
            htmlInput: { maxLength: NAME_MAX, 'aria-label': t('lessonNameLabel') },
          }}
          sx={{ flexGrow: 1, maxWidth: 520, '& input': { fontWeight: 800, fontSize: '1.2rem' } }}
        />
        {saving ? (
          <CircularProgress size={18} />
        ) : (
          <>
            <IconButton size="small" aria-label={t('saveName')} onClick={() => void commit()}>
              <CheckIcon sx={{ fontSize: 18 }} />
            </IconButton>
            <IconButton size="small" aria-label={t('cancel')} onClick={() => setEditing(false)}>
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </>
        )}
      </Stack>
    );
  }

  return (
    <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
      <Typography
        component="h1"
        sx={{ fontWeight: 800, fontSize: { xs: '1.4rem', sm: '1.7rem' }, color: 'text.primary' }}
      >
        {emoji ? `${emoji} ` : ''}
        {name}
      </Typography>
      {onRename && (
        <IconButton
          size="small"
          aria-label={t('renameLesson')}
          onClick={start}
          sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
        >
          <EditIcon sx={{ fontSize: 16 }} />
        </IconButton>
      )}
      <Chip
        size="small"
        variant="outlined"
        label={statusLabel}
        sx={{
          color: 'text.primary',
          fontWeight: 700,
          borderColor: alpha(statusColor, 0.4),
          bgcolor: alpha(statusColor, 0.1),
        }}
      />
    </Stack>
  );
}

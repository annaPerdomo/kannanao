'use client';

import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { StyledDialog } from '@/components/StyledDialog';
import type { Ohanashikai } from '@/types/ohanashikai';

interface CreateSpeechDialogProps {
  open: boolean;
  onClose: () => void;
  /** Usually `createOhanashikai` from the caller's own useOhanashikais(). */
  onCreate: (title: string, description?: string) => Promise<Ohanashikai>;
}

/**
 * Name a new speech and go write it. Takes `onCreate` rather than calling
 * useOhanashikais() itself, so the caller's own list state stays in sync.
 */
export function CreateSpeechDialog({ open, onClose, onCreate }: CreateSpeechDialogProps) {
  const t = useTranslations('Ohanashikai.home');
  const tc = useTranslations('Common');
  const theme = useTheme();
  const { brand } = theme.palette;
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    const name = title.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const item = await onCreate(name, description.trim() || undefined);
      setTitle('');
      setDescription('');
      onClose();
      router.push(`/ohanashikai/${item.id}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      title={t('newSpeechDialogTitle')}
      subtitle={t('newSpeechDialogSubtitle')}
      closeDisabled={creating}
      actions={
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose} sx={{ color: 'text.secondary', textTransform: 'none' }}>
            {tc('cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={creating || !title.trim()}
            sx={{
              bgcolor: brand[700],
              color: '#fff',
              textTransform: 'none',
              borderRadius: 6,
              px: 2.5,
              '&:hover': { bgcolor: brand[800] },
              '&:disabled': { bgcolor: alpha(brand[700], 0.2), color: alpha('#fff', 0.5) },
            }}
          >
            {creating ? t('creating') : t('createButton')}
          </Button>
        </Stack>
      }
    >
      <Stack spacing={2}>
        <TextField
          autoFocus
          fullWidth
          size="small"
          label={t('speechTitleLabel')}
          placeholder={t('speechTitlePlaceholder')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleCreate();
          }}
        />
        <TextField
          fullWidth
          size="small"
          label={t('descriptionLabel')}
          placeholder={t('descriptionPlaceholder')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Stack>
    </StyledDialog>
  );
}

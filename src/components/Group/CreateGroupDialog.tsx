'use client';

import GroupsIcon from '@mui/icons-material/Groups';
import { Button, Stack, TextField, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { StyledDialog } from '@/components/StyledDialog';

import { EncouragementEmojiPicker } from './EncouragementEmojiPicker';

interface CreateGroupDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, emoji?: string) => Promise<unknown>;
}

export function CreateGroupDialog({ open, onClose, onCreate }: CreateGroupDialogProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const t = useTranslations('Group.createGroup');
  const tc = useTranslations('Common');

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    try {
      await onCreate(name.trim(), emoji.trim() || undefined);
      setName('');
      setEmoji('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('createFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      title={t('title')}
      subtitle={t('subtitle')}
      icon={<GroupsIcon sx={{ color: brand[600], fontSize: 22 }} />}
      closeDisabled={saving}
      actions={
        <Stack direction="row" gap={1}>
          <Button
            onClick={onClose}
            disabled={saving}
            sx={{ color: 'text.secondary', textTransform: 'none', borderRadius: 6 }}
          >
            {tc('cancel')}
          </Button>
          <Button
            onClick={handleCreate}
            disabled={saving || !name.trim()}
            variant="contained"
            sx={{
              bgcolor: brand[700],
              color: '#fff',
              textTransform: 'none',
              borderRadius: 6,
              fontFamily: theme.fonts.cute,
              '&:hover': { bgcolor: brand[800] },
            }}
          >
            {saving ? t('creating') : t('createButton')}
          </Button>
        </Stack>
      }
    >
      <Stack gap={2.5}>
        <TextField
          fullWidth
          size="small"
          label={t('nameLabel')}
          placeholder={t('namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          slotProps={{ htmlInput: { maxLength: 100 } }}
          autoFocus
        />

        <Stack gap={0.5}>
          <Typography variant="body2" color="text.secondary">
            {t('emojiLabel')}
          </Typography>
          <EncouragementEmojiPicker value={emoji} onChange={setEmoji} allowEmpty />
        </Stack>

        {error && (
          <div style={{ color: theme.palette.error.main, fontSize: '0.85rem' }}>{error}</div>
        )}
      </Stack>
    </StyledDialog>
  );
}

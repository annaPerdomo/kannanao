'use client';

import GroupsIcon from '@mui/icons-material/Groups';
import { Button, Stack, TextField } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useState } from 'react';

import { StyledDialog } from '@/components/StyledDialog';

interface CreateGroupDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, emoji?: string) => Promise<unknown>;
}

export function CreateGroupDialog({ open, onClose, onCreate }: CreateGroupDialogProps) {
  const theme = useTheme();
  const { brand } = theme.palette;

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📚');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    try {
      await onCreate(name.trim(), emoji.trim() || '📚');
      setName('');
      setEmoji('📚');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
    } finally {
      setSaving(false);
    }
  };

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      title="Create Group"
      subtitle="Organize your members into groups"
      icon={<GroupsIcon sx={{ color: brand[600], fontSize: 22 }} />}
      closeDisabled={saving}
      actions={
        <Stack direction="row" gap={1}>
          <Button
            onClick={onClose}
            disabled={saving}
            sx={{ color: 'text.secondary', textTransform: 'none', borderRadius: 6 }}
          >
            Cancel
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
            {saving ? 'Creating...' : 'Create Group'}
          </Button>
        </Stack>
      }
    >
      <Stack gap={2.5}>
        <TextField
          fullWidth
          size="small"
          label="Group name"
          placeholder="e.g. Class A, Summer 2026"
          value={name}
          onChange={(e) => setName(e.target.value)}
          slotProps={{ htmlInput: { maxLength: 100 } }}
          autoFocus
        />

        <TextField
          fullWidth
          size="small"
          label="Emoji"
          placeholder="📚"
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          slotProps={{ htmlInput: { maxLength: 4 } }}
          helperText="An emoji to identify this group"
        />

        {error && (
          <div style={{ color: theme.palette.error.main, fontSize: '0.85rem' }}>{error}</div>
        )}
      </Stack>
    </StyledDialog>
  );
}

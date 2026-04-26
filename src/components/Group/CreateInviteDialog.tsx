'use client';

import QrCode2Icon from '@mui/icons-material/QrCode2';
import {
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useState } from 'react';

import { StyledDialog } from '@/components/StyledDialog';
import type { CreateInviteParams, InviteCode } from '@/hooks/useInvites';

interface CreateInviteDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (invite: InviteCode) => void;
  onCreate: (params: CreateInviteParams) => Promise<InviteCode>;
}

export function CreateInviteDialog({ open, onClose, onCreated, onCreate }: CreateInviteDialogProps) {
  const theme = useTheme();
  const { brand } = theme.palette;

  const [label, setLabel] = useState('');
  const [maxUses, setMaxUses] = useState<string>('1');
  const [expiresIn, setExpiresIn] = useState<'24h' | '7d' | '30d' | 'never'>('7d');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    try {
      const invite = await onCreate({
        label: label.trim() || undefined,
        maxUses: maxUses === 'unlimited' ? null : Number(maxUses),
        expiresIn,
      });
      onCreated(invite);
      // Reset form
      setLabel('');
      setMaxUses('1');
      setExpiresIn('7d');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invite');
    } finally {
      setSaving(false);
    }
  };

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      title="Create Invite Link"
      subtitle="Generate a QR code to onboard new members"
      icon={<QrCode2Icon sx={{ color: brand[600], fontSize: 22 }} />}
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
            disabled={saving}
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
            {saving ? 'Creating...' : 'Create Invite'}
          </Button>
        </Stack>
      }
    >
      <Stack gap={2.5}>
        <TextField
          fullWidth
          size="small"
          label="Label (optional)"
          placeholder="e.g. Yuki's class, Summer camp group"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          helperText="A friendly name to help you identify this invite"
          slotProps={{ htmlInput: { maxLength: 100 } }}
        />

        <FormControl fullWidth size="small">
          <InputLabel>Max uses</InputLabel>
          <Select
            value={maxUses}
            label="Max uses"
            onChange={(e) => setMaxUses(e.target.value)}
          >
            <MenuItem value="1">1 member</MenuItem>
            <MenuItem value="5">5 members</MenuItem>
            <MenuItem value="10">10 members</MenuItem>
            <MenuItem value="unlimited">Unlimited</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel>Expires</InputLabel>
          <Select
            value={expiresIn}
            label="Expires"
            onChange={(e) => setExpiresIn(e.target.value as typeof expiresIn)}
          >
            <MenuItem value="24h">24 hours</MenuItem>
            <MenuItem value="7d">7 days</MenuItem>
            <MenuItem value="30d">30 days</MenuItem>
            <MenuItem value="never">Never</MenuItem>
          </Select>
        </FormControl>

        {error && (
          <div style={{ color: theme.palette.error.main, fontSize: '0.85rem' }}>{error}</div>
        )}
      </Stack>
    </StyledDialog>
  );
}

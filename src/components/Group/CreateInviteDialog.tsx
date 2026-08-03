'use client';

import QrCode2Icon from '@mui/icons-material/QrCode2';
import {
  Button,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { StyledDialog } from '@/components/StyledDialog';
import type { CreateInviteParams, InviteCode } from '@/hooks/useInvites';

import { InviteList } from './InviteList';

interface CreateInviteDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (invite: InviteCode) => void;
  onCreate: (params: CreateInviteParams) => Promise<InviteCode>;
  /** Pass the existing codes to make this the one place invites are managed. */
  invites?: InviteCode[];
  onRevoke?: (id: string) => void;
  onShowQR?: (invite: InviteCode) => void;
}

export function CreateInviteDialog({
  open,
  onClose,
  onCreated,
  onCreate,
  invites,
  onRevoke,
  onShowQR,
}: CreateInviteDialogProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const t = useTranslations('Group.createInvite');
  const tc = useTranslations('Common');

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
      icon={<QrCode2Icon sx={{ color: brand[600], fontSize: 22 }} />}
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
            {saving ? t('creating') : t('createButton')}
          </Button>
        </Stack>
      }
    >
      <Stack gap={2.5}>
        {invites && invites.length > 0 && onRevoke && onShowQR && (
          <Stack gap={1}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'text.primary' }}>
              {t('activeCodesHeading')}
            </Typography>
            <InviteList invites={invites} onRevoke={onRevoke} onShowQR={onShowQR} />
            <Divider sx={{ mt: 1 }} />
            <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'text.primary' }}>
              {t('newCodeHeading')}
            </Typography>
          </Stack>
        )}

        <TextField
          fullWidth
          size="small"
          label={t('labelField')}
          placeholder={t('labelPlaceholder')}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          helperText={t('labelHelper')}
          slotProps={{ htmlInput: { maxLength: 100 } }}
        />

        <FormControl fullWidth size="small">
          <InputLabel>{t('maxUses')}</InputLabel>
          <Select value={maxUses} label={t('maxUses')} onChange={(e) => setMaxUses(e.target.value)}>
            <MenuItem value="1">{t('membersCount', { count: 1 })}</MenuItem>
            <MenuItem value="5">{t('membersCount', { count: 5 })}</MenuItem>
            <MenuItem value="10">{t('membersCount', { count: 10 })}</MenuItem>
            <MenuItem value="unlimited">{t('maxUsesUnlimited')}</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth size="small">
          <InputLabel>{t('expiresLabel')}</InputLabel>
          <Select
            value={expiresIn}
            label={t('expiresLabel')}
            onChange={(e) => setExpiresIn(e.target.value as typeof expiresIn)}
          >
            <MenuItem value="24h">{t('expires24h')}</MenuItem>
            <MenuItem value="7d">{t('expires7d')}</MenuItem>
            <MenuItem value="30d">{t('expires30d')}</MenuItem>
            <MenuItem value="never">{t('expiresNever')}</MenuItem>
          </Select>
        </FormControl>

        {error && (
          <div style={{ color: theme.palette.error.main, fontSize: '0.85rem' }}>{error}</div>
        )}
      </Stack>
    </StyledDialog>
  );
}

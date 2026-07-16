'use client';

import BadgeIcon from '@mui/icons-material/Badge';
import EditIcon from '@mui/icons-material/Edit';
import KeyIcon from '@mui/icons-material/Key';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import SettingsIcon from '@mui/icons-material/Settings';
import TranslateIcon from '@mui/icons-material/Translate';
import {
  Alert,
  Box,
  Button,
  Divider,
  FormControlLabel,
  Paper,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { CreateInviteDialog, InviteList, InviteQRCode } from '@/components/Group';
import { Loading } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import type { InviteCode } from '@/hooks/useInvites';
import { useInvites } from '@/hooks/useInvites';
import { LAYOUT } from '@/theme';

import { LanguagePicker } from './LanguagePicker';

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}

function Section({ icon, title, description, children }: SectionProps) {
  const theme = useTheme();
  const { brand, surfaces } = theme.palette;
  return (
    <Paper
      sx={{
        p: 3,
        borderRadius: 4,
        border: `1px solid ${alpha(brand[200], 0.4)}`,
        bgcolor: surfaces.glass,
      }}
    >
      <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 0.5 }}>
        <Box sx={{ color: brand[500], display: 'flex' }}>{icon}</Box>
        <Typography
          sx={{
            fontFamily: (t) => t.fonts.cute,
            fontWeight: 600,
            fontSize: '1.05rem',
            color: brand[700],
          }}
        >
          {title}
        </Typography>
      </Stack>
      <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', mb: 2 }}>
        {description}
      </Typography>
      {children}
    </Paper>
  );
}

export default function SettingsPage() {
  const t = useTranslations('Settings');
  const tCommon = useTranslations('Common');
  const theme = useTheme();
  const { brand } = theme.palette;
  const {
    user,
    loading,
    displayName,
    updateDisplayName,
    session,
    signOut,
    isMemberAccount,
    reviewReminders,
    updateReviewReminders,
  } = useAuth();
  const router = useRouter();
  const { invites, createInvite, revokeInvite } = useInvites();

  const currentUsername = user?.email?.split('@')[0] ?? '';

  // Display name
  const [newDisplayName, setNewDisplayName] = useState('');
  const [displayNameOpen, setDisplayNameOpen] = useState(false);
  const [displayNameSaving, setDisplayNameSaving] = useState(false);

  // Username
  const [newUsername, setNewUsername] = useState('');
  const [usernameOpen, setUsernameOpen] = useState(false);
  const [usernameSaving, setUsernameSaving] = useState(false);

  // Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Daily review reminder
  const [reminderSaving, setReminderSaving] = useState(false);

  // Invite dialogs
  const [createInviteOpen, setCreateInviteOpen] = useState(false);
  const [qrInvite, setQrInvite] = useState<InviteCode | null>(null);

  const [snack, setSnack] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null);

  const saveBtnSx = {
    bgcolor: brand[700],
    color: '#fff',
    textTransform: 'none' as const,
    borderRadius: 6,
    fontFamily: theme.fonts.cute,
    '&:hover': { bgcolor: brand[800] },
    '&.Mui-disabled': { opacity: 0.5 },
  };

  const cancelBtnSx = {
    color: 'text.secondary',
    textTransform: 'none' as const,
    borderRadius: 6,
  };

  async function patchProfile(body: object) {
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    return res.json() as Promise<{ message?: string; error?: string }>;
  }

  const handleSaveDisplayName = async () => {
    setDisplayNameSaving(true);
    try {
      const json = await patchProfile({ action: 'changeDisplayName', displayName: newDisplayName });
      if (json.error) {
        setSnack({ msg: json.error, severity: 'error' });
      } else {
        await updateDisplayName(newDisplayName);
        setSnack({ msg: t('displayName.updatedSuccess'), severity: 'success' });
        setDisplayNameOpen(false);
        setNewDisplayName('');
      }
    } catch {
      setSnack({ msg: t('networkError'), severity: 'error' });
    } finally {
      setDisplayNameSaving(false);
    }
  };

  const handleSaveUsername = async () => {
    setUsernameSaving(true);
    try {
      const json = await patchProfile({ action: 'changeUsername', username: newUsername });
      if (json.error) {
        setSnack({ msg: json.error, severity: 'error' });
        setUsernameSaving(false);
      } else {
        setSnack({ msg: t('username.updatedSuccess'), severity: 'success' });
        setTimeout(async () => {
          await signOut();
          router.push('/login');
        }, 1500);
      }
    } catch {
      setSnack({ msg: t('networkError'), severity: 'error' });
      setUsernameSaving(false);
    }
  };

  const handleToggleReminders = async (enabled: boolean) => {
    setReminderSaving(true);
    const { error } = await updateReviewReminders(enabled);
    setReminderSaving(false);
    setSnack(
      error
        ? { msg: t('reminders.saveError'), severity: 'error' }
        : {
            msg: enabled ? t('reminders.onSuccess') : t('reminders.offSuccess'),
            severity: 'success',
          },
    );
  };

  const handleSavePassword = async () => {
    if (newPassword !== confirmPassword) {
      setSnack({ msg: t('password.mismatchError'), severity: 'error' });
      return;
    }
    setPasswordSaving(true);
    try {
      const json = await patchProfile({ action: 'changePassword', password: newPassword });
      if (json.error) {
        setSnack({ msg: json.error, severity: 'error' });
      } else {
        setSnack({ msg: t('password.updatedSuccess'), severity: 'success' });
        setPasswordOpen(false);
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setSnack({ msg: t('networkError'), severity: 'error' });
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) return <Loading />;
  if (!user) {
    router.replace('/login');
    return null;
  }

  const fieldSx = { mt: 0.5 };

  return (
    <Box
      sx={{
        maxWidth: LAYOUT.narrowMaxWidth,
        mx: 'auto',
        px: LAYOUT.pagePx,
        py: { xs: 2, sm: 4 },
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      <PageHeader
        icon={<SettingsIcon />}
        title={t('pageHeader.title')}
        subtitle={t('pageHeader.subtitle')}
        mb={0}
      />

      <Stack gap={2.5}>
        {/* Display Name */}
        <Section
          icon={<BadgeIcon />}
          title={t('displayName.title')}
          description={t('displayName.description')}
        >
          <Typography sx={{ fontSize: '0.85rem', color: 'text.primary', mb: 1.5 }}>
            {t('currentLabel')} <strong>{displayName ?? <em>{t('noneFallback')}</em>}</strong>
          </Typography>
          {!displayNameOpen ? (
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                setNewDisplayName(displayName ?? '');
                setDisplayNameOpen(true);
              }}
              sx={{
                borderRadius: 6,
                textTransform: 'none',
                borderColor: alpha(brand[400], 0.5),
                color: brand[700],
              }}
            >
              {t('displayName.changeButton')}
            </Button>
          ) : (
            <Stack gap={1.5}>
              <TextField
                autoFocus
                fullWidth
                size="small"
                label={t('displayName.fieldLabel')}
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleSaveDisplayName();
                }}
                helperText={t('displayName.fieldHelper')}
                sx={fieldSx}
              />
              <Stack direction="row" gap={1}>
                <Button onClick={() => setDisplayNameOpen(false)} sx={cancelBtnSx}>
                  {tCommon('cancel')}
                </Button>
                <Button
                  onClick={handleSaveDisplayName}
                  disabled={displayNameSaving}
                  variant="contained"
                  sx={saveBtnSx}
                >
                  {displayNameSaving ? t('saving') : tCommon('save')}
                </Button>
              </Stack>
            </Stack>
          )}
        </Section>

        <Divider />

        {/* Username */}
        <Section
          icon={<EditIcon />}
          title={t('username.title')}
          description={t('username.description')}
        >
          <Typography sx={{ fontSize: '0.85rem', color: 'text.primary', mb: 1.5 }}>
            {t('currentLabel')} <strong>@{currentUsername}</strong>
          </Typography>
          {!usernameOpen ? (
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                setNewUsername('');
                setUsernameOpen(true);
              }}
              sx={{
                borderRadius: 6,
                textTransform: 'none',
                borderColor: alpha(brand[400], 0.5),
                color: brand[700],
              }}
            >
              {t('username.changeButton')}
            </Button>
          ) : (
            <Stack gap={1.5}>
              <TextField
                autoFocus
                fullWidth
                size="small"
                label={t('username.fieldLabel')}
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleSaveUsername();
                }}
                helperText={t('username.fieldHelper')}
                sx={fieldSx}
              />
              <Stack direction="row" gap={1}>
                <Button onClick={() => setUsernameOpen(false)} sx={cancelBtnSx}>
                  {tCommon('cancel')}
                </Button>
                <Button
                  onClick={handleSaveUsername}
                  disabled={usernameSaving || !newUsername.trim()}
                  variant="contained"
                  sx={saveBtnSx}
                >
                  {usernameSaving ? t('saving') : tCommon('save')}
                </Button>
              </Stack>
            </Stack>
          )}
        </Section>

        <Divider />

        {/* Language — title deliberately bilingual and NOT a message key: it is
            the signpost a user who can't read the current UI scans for, so it
            has to read in both languages in both locales. */}
        <Section
          icon={<TranslateIcon />}
          title="Language / 言語"
          description={t('language.description')}
        >
          <LanguagePicker />
        </Section>

        <Divider />

        {/* Daily review reminder */}
        <Section
          icon={<NotificationsActiveIcon />}
          title={t('reminders.title')}
          description={t('reminders.description')}
        >
          <FormControlLabel
            control={
              <Switch
                checked={reviewReminders}
                onChange={(e) => void handleToggleReminders(e.target.checked)}
                disabled={reminderSaving}
                inputProps={{ 'aria-label': t('reminders.ariaLabel') }}
              />
            }
            label={t('reminders.ariaLabel')}
            sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.9rem', color: 'text.primary' } }}
          />
        </Section>

        {!isMemberAccount && (
          <>
            <Divider />

            {/* Invite Members */}
            <Section
              icon={<QrCode2Icon />}
              title={t('inviteMembers.title')}
              description={t('inviteMembers.description')}
            >
              <Stack gap={2}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setCreateInviteOpen(true)}
                  sx={{
                    borderRadius: 6,
                    textTransform: 'none',
                    borderColor: alpha(brand[400], 0.5),
                    color: brand[700],
                    alignSelf: 'flex-start',
                  }}
                >
                  {t('inviteMembers.createButton')}
                </Button>
                <InviteList
                  invites={invites}
                  onRevoke={revokeInvite}
                  onShowQR={(invite) => setQrInvite(invite)}
                />
              </Stack>
            </Section>
          </>
        )}

        <Divider />

        {/* Password */}
        <Section
          icon={<KeyIcon />}
          title={t('password.title')}
          description={t('password.description')}
        >
          {!passwordOpen ? (
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                setNewPassword('');
                setConfirmPassword('');
                setPasswordOpen(true);
              }}
              sx={{
                borderRadius: 6,
                textTransform: 'none',
                borderColor: alpha(brand[400], 0.5),
                color: brand[700],
              }}
            >
              {t('password.changeButton')}
            </Button>
          ) : (
            <Stack gap={1.5}>
              <TextField
                autoFocus
                fullWidth
                size="small"
                type="password"
                label={t('password.newFieldLabel')}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                helperText={t('password.newFieldHelper')}
                sx={fieldSx}
              />
              <TextField
                fullWidth
                size="small"
                type="password"
                label={t('password.confirmFieldLabel')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleSavePassword();
                }}
                sx={fieldSx}
              />
              <Stack direction="row" gap={1}>
                <Button onClick={() => setPasswordOpen(false)} sx={cancelBtnSx}>
                  {tCommon('cancel')}
                </Button>
                <Button
                  onClick={handleSavePassword}
                  disabled={passwordSaving || !newPassword || !confirmPassword}
                  variant="contained"
                  sx={saveBtnSx}
                >
                  {passwordSaving ? t('saving') : tCommon('save')}
                </Button>
              </Stack>
            </Stack>
          )}
        </Section>
      </Stack>

      <CreateInviteDialog
        open={createInviteOpen}
        onClose={() => setCreateInviteOpen(false)}
        onCreate={createInvite}
        onCreated={(invite) => {
          setCreateInviteOpen(false);
          setQrInvite(invite);
        }}
      />

      {qrInvite && (
        <InviteQRCode
          open={Boolean(qrInvite)}
          onClose={() => setQrInvite(null)}
          code={qrInvite.code}
          label={qrInvite.label}
          organizerName={displayName ?? currentUsername}
        />
      )}

      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snack?.severity ?? 'success'}
          onClose={() => setSnack(null)}
          sx={{ width: '100%' }}
        >
          {snack?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

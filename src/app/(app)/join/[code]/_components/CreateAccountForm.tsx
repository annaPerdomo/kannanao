'use client';

import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { readLocaleCookie } from '@/i18n/localeCookie';
import { dbRecordLogin, sb } from '@/lib/supabase';

interface CreateAccountFormProps {
  code: string;
  onSwitchToSignIn: () => void;
}

/** New learner: create a member account and join in one submit. */
export function CreateAccountForm({ code, onSwitchToSignIn }: CreateAccountFormProps) {
  const t = useTranslations('Group.joinPage');

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const usernameError =
    username && !/^[a-zA-Z0-9_-]+$/.test(username) ? t('usernameInvalidChars') : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t('passwordsDoNotMatch'));
      return;
    }
    if (username.length < 2 || username.length > 30) {
      setError(t('usernameLengthError'));
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      setError(t('usernameCharsError'));
      return;
    }
    if (password.length < 6) {
      setError(t('passwordLengthError'));
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          username: username.trim(),
          displayName: displayName.trim() || undefined,
          password,
          // The landing toggle's pick, and the one moment it can be attached to
          // the row. `undefined` (no cookie = no preference) must stay distinct
          // from 'en'.
          locale: readLocaleCookie() ?? undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? t('createAccountFailed'));
        setBusy(false);
        return;
      }

      if (data.session) {
        const { data: sessionData } = await sb.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        if (sessionData.user) void dbRecordLogin(sessionData.user.id);
      }

      window.location.assign('/');
    } catch {
      setError(t('networkError'));
      setBusy(false);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <TextField
        label={t('usernameLabel')}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        size="small"
        fullWidth
        required
        error={Boolean(usernameError)}
        helperText={usernameError ?? t('usernameHelperText')}
        autoComplete="username"
      />

      <TextField
        label={t('displayNameLabel')}
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        size="small"
        fullWidth
        helperText={t('displayNameHelperText')}
        slotProps={{ htmlInput: { maxLength: 100 } }}
      />

      <TextField
        label={t('passwordLabel')}
        type={showPassword ? 'text' : 'password'}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        size="small"
        fullWidth
        required
        autoComplete="new-password"
        helperText={t('passwordHelperText')}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => setShowPassword((s) => !s)}
                  edge="end"
                  aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                >
                  {showPassword ? (
                    <VisibilityOff fontSize="small" />
                  ) : (
                    <Visibility fontSize="small" />
                  )}
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />

      <TextField
        label={t('confirmPasswordLabel')}
        type={showPassword ? 'text' : 'password'}
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        size="small"
        fullWidth
        required
        autoComplete="new-password"
      />

      {error && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Button
        type="submit"
        variant="contained"
        disabled={busy || Boolean(usernameError)}
        sx={{
          bgcolor: 'primary.dark',
          color: '#fff',
          fontFamily: (theme) => theme.fonts.display,
          textTransform: 'none',
          borderRadius: 6,
          '&:hover': { bgcolor: 'primary.dark', filter: 'brightness(0.9)' },
        }}
      >
        {busy ? <CircularProgress size={20} color="inherit" /> : t('joinButton')}
      </Button>

      <Button
        variant="text"
        onClick={onSwitchToSignIn}
        disabled={busy}
        sx={{ textTransform: 'none', fontSize: '0.82rem' }}
      >
        {t('alreadyHaveAccountSwitch')}
      </Button>
    </Box>
  );
}

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
  Typography,
} from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';

import { joinWithCurrentAccount } from './joinRequests';

interface SignInAndJoinFormProps {
  code: string;
  onSwitchToCreate: () => void;
}

/** Existing account, signed out: sign in and join in one submit. */
export function SignInAndJoinForm({ code, onSwitchToCreate }: SignInAndJoinFormProps) {
  const t = useTranslations('Group.joinPage');
  const { signInWithUsername } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setBusy(true);
    setError(null);

    const signIn = await signInWithUsername(username, password);
    if (signIn.error) {
      setError(signIn.error);
      setBusy(false);
      return;
    }

    const joined = await joinWithCurrentAccount(code);
    if (joined) {
      setError(t(`joinErrors.${joined.code}`) || joined.message);
      setBusy(false);
      return;
    }

    window.location.assign('/');
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <Typography sx={{ textAlign: 'center', fontSize: '0.82rem', color: 'text.secondary' }}>
        {t('signInToJoinHint')}
      </Typography>

      <TextField
        label={t('usernameLabel')}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        size="small"
        fullWidth
        required
        autoComplete="username"
      />

      <TextField
        label={t('passwordLabel')}
        type={showPassword ? 'text' : 'password'}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        size="small"
        fullWidth
        required
        autoComplete="current-password"
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

      {error && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Button
        type="submit"
        variant="contained"
        disabled={busy}
        sx={{
          bgcolor: 'primary.dark',
          color: '#fff',
          fontFamily: (theme) => theme.fonts.display,
          textTransform: 'none',
          borderRadius: 6,
          '&:hover': { bgcolor: 'primary.dark', filter: 'brightness(0.9)' },
        }}
      >
        {busy ? <CircularProgress size={20} color="inherit" /> : t('signInAndJoinButton')}
      </Button>

      <Button
        variant="text"
        onClick={onSwitchToCreate}
        disabled={busy}
        sx={{ textTransform: 'none', fontSize: '0.82rem' }}
      >
        {t('newHereSwitch')}
      </Button>
    </Box>
  );
}

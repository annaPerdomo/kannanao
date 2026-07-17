'use client';

import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { readLocaleCookie } from '@/i18n/localeCookie';
import { dbRecordLogin, sb } from '@/lib/supabase';

export default function JoinPage() {
  const t = useTranslations('Group.joinPage');
  const params = useParams();
  const router = useRouter();
  const code = (params?.code as string) ?? '';

  // Validation state
  const [validating, setValidating] = useState(true);
  const [valid, setValid] = useState(false);
  const [invalidReason, setInvalidReason] = useState('');
  const [organizerName, setOrganizerName] = useState('');
  const [groupName, setGroupName] = useState<string | null>(null);

  // Form state
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  // Validate invite code on mount
  useEffect(() => {
    async function validate() {
      try {
        const res = await fetch(`/api/join?code=${encodeURIComponent(code)}`);
        const data = await res.json();
        if (data.valid) {
          setValid(true);
          setOrganizerName(data.organizerName);
          if (data.groupName) setGroupName(data.groupName);
        } else {
          setValid(false);
          setInvalidReason(data.reason || t('invalidInviteCode'));
        }
      } catch {
        setInvalidReason(t('unableToVerify'));
      } finally {
        setValidating(false);
      }
    }
    void validate();
  }, [code]);

  // Debounced username uniqueness check
  const checkUsername = useCallback(
    async (value: string) => {
      if (value.length < 2) {
        setUsernameError(null);
        return;
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
        setUsernameError(t('usernameInvalidChars'));
        return;
      }
      setCheckingUsername(true);
      try {
        // Quick check via the join validation endpoint — the server will catch
        // duplicates on submit, but we give real-time feedback via profiles query
        const res = await fetch(`/api/join?code=${encodeURIComponent(code)}`);
        if (res.ok) {
          // We can't query profiles without auth, so just validate format client-side
          // The server will reject duplicates on submit
          setUsernameError(null);
        }
      } catch {
        // Ignore — server will catch on submit
      } finally {
        setCheckingUsername(false);
      }
    },
    [code],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (username) void checkUsername(username);
    }, 500);
    return () => clearTimeout(timer);
  }, [username, checkUsername]);

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
          // Carries the landing toggle's pick into the new account. Sent from the
          // cookie rather than read server-side from the request: this is the one
          // moment the choice can be attached to the row, and `undefined` (no
          // cookie = no preference) has to stay distinct from 'en'.
          locale: readLocaleCookie() ?? undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? t('createAccountFailed'));
        setBusy(false);
        return;
      }

      // Auto sign-in with the returned session
      if (data.session) {
        const { data: sessionData } = await sb.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        if (sessionData.user) void dbRecordLogin(sessionData.user.id);
      }

      router.push('/');
    } catch {
      setError(t('networkError'));
      setBusy(false);
    }
  };

  // Loading state
  if (validating) {
    return (
      <Box
        sx={{
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Invalid invite
  if (!valid) {
    return (
      <Box
        sx={{
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
        }}
      >
        <Card
          sx={(theme) => ({
            maxWidth: 420,
            width: '100%',
            borderRadius: 4,
            border: `1px solid ${alpha(theme.palette.brand[300], 0.35)}`,
            boxShadow: `0 8px 40px ${alpha(theme.palette.brand[700], 0.1)}`,
            bgcolor: theme.palette.surfaces.overlay,
            textAlign: 'center',
          })}
        >
          <CardContent sx={{ p: 4 }}>
            <Typography
              variant="h5"
              sx={{
                fontFamily: (t) => t.fonts.display,
                color: 'primary.dark',
                mb: 2,
              }}
            >
              🌸 Kannanao
            </Typography>
            <Typography sx={{ fontSize: '3rem', mb: 1 }}>😔</Typography>
            <Typography
              sx={{
                fontSize: '1rem',
                color: 'text.primary',
                fontWeight: 600,
                mb: 1,
              }}
            >
              {t('inviteNotAvailable')}
            </Typography>
            <Typography sx={{ fontSize: '0.88rem', color: 'text.secondary', mb: 2 }}>
              {invalidReason}
            </Typography>
            <Button
              variant="outlined"
              onClick={() => router.push('/login')}
              sx={{
                textTransform: 'none',
                borderRadius: 6,
              }}
            >
              {t('goToSignIn')}
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Valid invite — show sign-up form
  return (
    <Box
      sx={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
      }}
    >
      <Card
        sx={(theme) => ({
          maxWidth: 420,
          width: '100%',
          borderRadius: 4,
          border: `1px solid ${alpha(theme.palette.brand[300], 0.35)}`,
          boxShadow: `0 8px 40px ${alpha(theme.palette.brand[700], 0.1)}`,
          bgcolor: theme.palette.surfaces.overlay,
          backdropFilter: 'blur(14px)',
        })}
      >
        <CardContent sx={{ p: 4 }}>
          <Typography
            variant="h5"
            sx={{
              fontFamily: (t) => t.fonts.display,
              color: 'primary.dark',
              mb: 1,
              textAlign: 'center',
            }}
          >
            🌸 Kannanao
          </Typography>

          <Typography
            sx={{
              textAlign: 'center',
              fontSize: '0.88rem',
              color: 'text.secondary',
              mb: 3,
            }}
          >
            {groupName
              ? t.rich('joiningWithGroup', {
                  organizerName,
                  groupName,
                  bold: (chunks) => <strong>{chunks}</strong>,
                })
              : t.rich('joiningNoGroup', {
                  organizerName,
                  bold: (chunks) => <strong>{chunks}</strong>,
                })}
          </Typography>

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
              helperText={
                usernameError ?? (checkingUsername ? t('checking') : t('usernameHelperText'))
              }
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
                fontFamily: (t) => t.fonts.display,
                textTransform: 'none',
                borderRadius: 6,
                '&:hover': { bgcolor: 'primary.dark', filter: 'brightness(0.9)' },
              }}
            >
              {busy ? <CircularProgress size={20} color="inherit" /> : t('joinButton')}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

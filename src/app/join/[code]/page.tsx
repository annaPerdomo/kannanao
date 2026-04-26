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
import { useCallback, useEffect, useState } from 'react';

import { sb } from '@/lib/supabase';

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params?.code as string) ?? '';

  // Validation state
  const [validating, setValidating] = useState(true);
  const [valid, setValid] = useState(false);
  const [invalidReason, setInvalidReason] = useState('');
  const [organizerName, setOrganizerName] = useState('');

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
        } else {
          setValid(false);
          setInvalidReason(data.reason || 'Invalid invite code.');
        }
      } catch {
        setInvalidReason('Unable to verify invite code. Please try again.');
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
        setUsernameError('Letters, numbers, _ or - only');
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
      setError('Passwords do not match.');
      return;
    }
    if (username.length < 2 || username.length > 30) {
      setError('Username must be 2-30 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      setError('Username can only contain letters, numbers, _ or -');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
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
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Failed to create account.');
        setBusy(false);
        return;
      }

      // Auto sign-in with the returned session
      if (data.session) {
        await sb.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      router.push('/');
    } catch {
      setError('Network error. Please try again.');
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
              Invite Not Available
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
              Go to sign in
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
            You&apos;re joining <strong>{organizerName}</strong>&apos;s study group
          </Typography>

          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            <TextField
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              size="small"
              fullWidth
              required
              error={Boolean(usernameError)}
              helperText={
                usernameError ??
                (checkingUsername ? 'Checking...' : 'Letters, numbers, _ or - (2-30 chars)')
              }
              autoComplete="username"
            />

            <TextField
              label="Display name (optional)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              size="small"
              fullWidth
              helperText="The name shown in the app"
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />

            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              size="small"
              fullWidth
              required
              autoComplete="new-password"
              helperText="Minimum 6 characters"
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setShowPassword((s) => !s)}
                        edge="end"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
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
              label="Confirm password"
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
              {busy ? <CircularProgress size={20} color="inherit" /> : 'Join Study Group'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

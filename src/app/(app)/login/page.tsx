'use client';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import WaitlistForm from '@/components/WaitlistForm';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const t = useTranslations('Auth.login');
  const { signInWithUsername } = useAuth();

  const [showWaitlist, setShowWaitlist] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setBusy(true);
    setError(null);
    const result = await signInWithUsername(username, password);
    if (result.error) {
      setError(result.error);
      setBusy(false);
      return;
    }
    // Full-document navigation forces middleware re-evaluation instead of
    // replaying the Router-Cache stale landing.
    window.location.assign('/');
  };

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
              mb: 1.5,
              textAlign: 'center',
            }}
          >
            {t('brandName')}
          </Typography>

          <Chip
            label={t('betaBadge')}
            size="small"
            sx={{
              display: 'flex',
              mx: 'auto',
              mb: 2.5,
              bgcolor: 'rgba(251,191,36,0.12)',
              color: '#B45309',
              fontWeight: 700,
              fontSize: '0.72rem',
              border: '1px solid rgba(251,191,36,0.35)',
              borderRadius: 6,
            }}
          />

          {showWaitlist ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                {t('waitlistIntro')}
              </Typography>
              <WaitlistForm compact />
              <Divider sx={{ my: 0.5 }} />
              <Typography
                variant="body2"
                sx={{ textAlign: 'center', color: 'primary.dark', cursor: 'pointer' }}
                onClick={() => setShowWaitlist(false)}
              >
                {t('backToSignIn')}
              </Typography>
            </Box>
          ) : (
            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
            >
              <TextField
                label={t('usernameLabel')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                size="small"
                fullWidth
                required
              />
              <TextField
                label={t('passwordLabel')}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                size="small"
                fullWidth
                required
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setShowPassword((s) => !s)}
                          edge="end"
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
                  fontFamily: (t) => t.fonts.display,
                  textTransform: 'none',
                  borderRadius: 6,
                  '&:hover': { bgcolor: 'primary.dark', filter: 'brightness(0.9)' },
                }}
              >
                {busy ? <CircularProgress size={20} color="inherit" /> : t('submit')}
              </Button>
              <Divider sx={{ my: 0.5 }} />
              <Typography
                variant="body2"
                sx={{ textAlign: 'center', color: 'primary.dark', cursor: 'pointer' }}
                onClick={() => {
                  setShowWaitlist(true);
                  setError(null);
                }}
              >
                {t('joinWaitlist')}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

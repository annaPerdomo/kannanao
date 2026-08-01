'use client';
import LockOutlined from '@mui/icons-material/LockOutlined';
import PersonOutline from '@mui/icons-material/PersonOutline';
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

import { LANDING_DISPLAY_FONT, landingFontClass } from '@/app/landing/landingFonts';
import { SakuraIcon } from '@/components/SakuraIcon';
import WaitlistForm from '@/components/WaitlistForm';
import { useAuth } from '@/contexts/AuthContext';
import { APP_NAME } from '@/lib/brand';

import { LocalePill } from './LocalePill';
import { SakuraDrift } from './SakuraDrift';

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
      className={landingFontClass}
      sx={{
        position: 'relative',
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: { xs: 4, md: 3 },
        overflow: 'hidden',
      }}
    >
      {/* One <picture> (not two CSS-hidden <img>s) so each device downloads
          only its breakpoint's file; srcSet still gives retina the @2x. The
          media query must match the md breakpoint used by the layout below. */}
      <Box component="picture" aria-hidden sx={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <source
          media="(min-width: 900px)"
          srcSet="/login/background-friends.webp 1672w, /login/background-friends@2x.webp 3344w"
          sizes="100vw"
        />
        <Box
          component="img"
          alt=""
          src="/login/background.webp"
          srcSet="/login/background.webp 1672w, /login/background@2x.webp 3344w"
          sizes="100vw"
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'left bottom',
          }}
        />
      </Box>

      <SakuraDrift />

      <Box
        sx={{
          position: 'absolute',
          top: { xs: 10, sm: 18 },
          right: { xs: 10, sm: 18 },
          zIndex: 2,
        }}
      >
        <LocalePill />
      </Box>

      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 1160,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'center',
          gap: { xs: 3, md: 6 },
        }}
      >
        <Box
          sx={{
            flex: 1,
            textAlign: { xs: 'center', md: 'left' },
            // On desktop the friends artwork fills the lower half of this
            // column, so the text block rides above it instead of centering.
            pb: { md: 34 },
            pt: { xs: 1, md: 0 },
          }}
        >
          <Typography
            component="h1"
            sx={{
              fontFamily: LANDING_DISPLAY_FONT,
              fontWeight: 800,
              fontSize: { xs: '1.9rem', md: '3rem' },
              lineHeight: 1.15,
              color: 'text.primary',
              textShadow: '0 2px 12px rgba(255,255,255,0.75), 0 1px 4px rgba(255,255,255,0.6)',
            }}
          >
            {t('tagline1')}
            <Box component="span" sx={{ display: 'block', color: 'brand.700' }}>
              {t('tagline2')}
            </Box>
          </Typography>
          <Typography
            sx={{
              mt: { xs: 1, md: 2 },
              fontSize: { xs: '0.9rem', md: '1rem' },
              fontWeight: 500,
              color: 'text.primary',
              whiteSpace: 'pre-line',
              display: { xs: 'none', sm: 'block' },
              textShadow: '0 1px 8px rgba(255,255,255,0.75)',
            }}
          >
            {t('taglineSubtitle')}
          </Typography>
        </Box>

        <Card
          sx={(theme) => ({
            width: '100%',
            maxWidth: 440,
            flexShrink: 0,
            borderRadius: 5,
            border: `1px solid ${alpha(theme.palette.brand[300], 0.35)}`,
            boxShadow: `0 8px 40px ${alpha(theme.palette.brand[700], 0.14)}`,
            bgcolor: theme.palette.surfaces.overlay,
            backdropFilter: 'blur(14px)',
          })}
        >
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Box
              component="img"
              src="/brand/logo-wordmark.png"
              alt={APP_NAME}
              sx={{ display: 'block', height: 34, width: 'auto', mx: 'auto', mb: 1.5 }}
            />
            <Typography
              variant="h5"
              component="h2"
              sx={{
                fontFamily: LANDING_DISPLAY_FONT,
                fontWeight: 700,
                color: 'text.primary',
                textAlign: 'center',
              }}
            >
              {t('welcomeTitle')}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', textAlign: 'center', mt: 0.5, mb: 2 }}
            >
              {t('welcomeSubtitle')}
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
                  component="button"
                  type="button"
                  variant="body2"
                  sx={{
                    textAlign: 'center',
                    color: 'primary.dark',
                    cursor: 'pointer',
                    border: 'none',
                    background: 'none',
                    p: 0,
                    '&:hover': { textDecoration: 'underline' },
                  }}
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
                  fullWidth
                  required
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonOutline fontSize="small" sx={{ color: 'brand.400' }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <TextField
                  label={t('passwordLabel')}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  fullWidth
                  required
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockOutlined fontSize="small" sx={{ color: 'brand.400' }} />
                        </InputAdornment>
                      ),
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
                  size="large"
                  startIcon={busy ? undefined : <SakuraIcon />}
                  sx={{
                    fontFamily: LANDING_DISPLAY_FONT,
                    fontWeight: 700,
                    textTransform: 'none',
                    borderRadius: 6,
                  }}
                >
                  {busy ? <CircularProgress size={22} color="inherit" /> : t('submit')}
                </Button>
                <Divider sx={{ my: 0.5 }} />
                <Typography
                  component="button"
                  type="button"
                  variant="body2"
                  sx={{
                    textAlign: 'center',
                    color: 'primary.dark',
                    cursor: 'pointer',
                    border: 'none',
                    background: 'none',
                    p: 0,
                    '&:hover': { textDecoration: 'underline' },
                  }}
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
    </Box>
  );
}

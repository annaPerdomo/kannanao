'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { alpha } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

interface WaitlistFormProps {
  /** Compact layout for inline use (e.g. login page) */
  compact?: boolean;
  /** Dark background mode — brightens text and button for contrast */
  dark?: boolean;
}

export default function WaitlistForm({ compact, dark }: WaitlistFormProps) {
  const t = useTranslations('Auth.waitlistForm');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setResult(null);

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), name: name.trim(), message: message.trim() }),
      });
      const data = await res.json();

      if (res.ok) {
        setResult({ type: 'success', text: data.message });
        setEmail('');
        setName('');
        setMessage('');
      } else {
        setResult({ type: 'error', text: data.error ?? t('genericError') });
      }
    } catch {
      setResult({ type: 'error', text: t('networkError') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? 1.5 : 2,
        maxWidth: compact ? '100%' : 420,
        mx: compact ? 0 : 'auto',
        textAlign: 'left',
      }}
    >
      {!compact && (
        <Typography
          sx={{
            fontFamily: (t) => t.fonts.display,
            fontSize: '1.1rem',
            color: dark ? alpha('#fff', 0.9) : 'primary.dark',
            textAlign: 'center',
            mb: 0.5,
          }}
        >
          {t('heading')}
        </Typography>
      )}

      <TextField
        label={t('emailLabel')}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        size="small"
        fullWidth
        required
        placeholder={t('emailPlaceholder')}
      />
      <TextField
        label={t('nameLabel')}
        value={name}
        onChange={(e) => setName(e.target.value)}
        size="small"
        fullWidth
        placeholder={t('namePlaceholder')}
      />
      {!compact && (
        <TextField
          label={t('messageLabel')}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          size="small"
          fullWidth
          multiline
          minRows={2}
          maxRows={4}
          placeholder={t('messagePlaceholder')}
        />
      )}

      {result && (
        <Alert severity={result.type} sx={{ borderRadius: 2 }}>
          {result.text}
        </Alert>
      )}

      <Button
        type="submit"
        variant="contained"
        disabled={busy}
        sx={{
          background: dark ? 'linear-gradient(135deg, #F472B6 0%, #EC4899 100%)' : undefined,
          bgcolor: dark ? undefined : 'primary.dark',
          color: '#fff',
          fontFamily: (t) => t.fonts.display,
          textTransform: 'none',
          borderRadius: 6,
          py: 1.2,
          boxShadow: dark ? '0 8px 28px rgba(236,72,153,0.45)' : undefined,
          '&:hover': dark
            ? {
                filter: 'brightness(1.08)',
                transform: 'translateY(-2px)',
                boxShadow: '0 12px 36px rgba(236,72,153,0.55)',
              }
            : { bgcolor: 'primary.dark', filter: 'brightness(0.9)' },
        }}
      >
        {busy ? <CircularProgress size={20} color="inherit" /> : t('submitButton')}
      </Button>
    </Box>
  );
}

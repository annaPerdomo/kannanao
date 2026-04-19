'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { FONT_DISPLAY } from '@/theme';

interface WaitlistFormProps {
  /** Compact layout for inline use (e.g. login page) */
  compact?: boolean;
  /** Dark background mode — brightens text and button for contrast */
  dark?: boolean;
}

export default function WaitlistForm({ compact, dark }: WaitlistFormProps) {
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
        setResult({ type: 'error', text: data.error ?? 'Something went wrong.' });
      }
    } catch {
      setResult({ type: 'error', text: 'Network error. Please try again.' });
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
            fontFamily: FONT_DISPLAY,
            fontSize: '1.1rem',
            color: dark ? alpha('#fff', 0.9) : 'primary.dark',
            textAlign: 'center',
            mb: 0.5,
          }}
        >
          Join the waitlist
        </Typography>
      )}

      <TextField
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        size="small"
        fullWidth
        required
        placeholder="you@example.com"
      />
      <TextField
        label="Name (optional)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        size="small"
        fullWidth
        placeholder="Your name"
      />
      {!compact && (
        <TextField
          label="What do you want to use Kannanao for? (optional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          size="small"
          fullWidth
          multiline
          minRows={2}
          maxRows={4}
          placeholder="I'm studying for JLPT N3…"
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
          background: dark
            ? 'linear-gradient(135deg, #F472B6 0%, #EC4899 100%)'
            : undefined,
          bgcolor: dark ? undefined : 'primary.dark',
          color: '#fff',
          fontFamily: FONT_DISPLAY,
          textTransform: 'none',
          borderRadius: 6,
          py: 1.2,
          boxShadow: dark ? '0 8px 28px rgba(236,72,153,0.45)' : undefined,
          '&:hover': dark
            ? { filter: 'brightness(1.08)', transform: 'translateY(-2px)', boxShadow: '0 12px 36px rgba(236,72,153,0.55)' }
            : { bgcolor: 'primary.dark', filter: 'brightness(0.9)' },
        }}
      >
        {busy ? <CircularProgress size={20} color="inherit" /> : 'Notify me when spots open 🌸'}
      </Button>
    </Box>
  );
}

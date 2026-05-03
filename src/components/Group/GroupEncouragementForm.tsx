'use client';
import SendIcon from '@mui/icons-material/Send';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { alpha, useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { EncouragementEmojiPicker } from './EncouragementEmojiPicker';
const QUICK_MESSAGES = ['Great job!', 'Keep going!', "I'm proud of you!", 'Amazing progress!'];

interface GroupEncouragementFormProps {
  members: { id: string; username: string }[];
  onSend: (memberId: string, message: string, emoji?: string) => Promise<unknown>;
}

export function GroupEncouragementForm({ members, onSend }: GroupEncouragementFormProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const [message, setMessage] = useState('');
  const [emoji, setEmoji] = useState('⭐');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async (text?: string) => {
    const msg = text ?? message.trim();
    if (!msg || members.length === 0) return;
    setSending(true);
    setError(null);
    try {
      await Promise.all(members.map((m) => onSend(m.id, msg, emoji)));
      setMessage('');
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch {
      setError('Failed to send to some members. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (members.length === 0) return null;

  return (
    <Box
      sx={{
        p: 2.5,
        border: `1.5px solid ${alpha(brand[300], 0.35)}`,
        borderRadius: 3,
        bgcolor: alpha(brand[50], 0.4),
      }}
    >
      <Typography
        sx={{
          fontWeight: 800,
          fontSize: '0.75rem',
          color: brand[600],
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          mb: 0.5,
        }}
      >
        Send Encouragement to Entire Group
      </Typography>
      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mb: 1.5 }}>
        {members.length === 1
          ? 'Your message will be sent to your member'
          : `Your message will be sent to all ${members.length} members`}
      </Typography>

      {/* Emoji picker */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <EncouragementEmojiPicker value={emoji} onChange={setEmoji} />
        <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
          Tap to change emoji
        </Typography>
      </Box>

      {/* Quick messages */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
        {QUICK_MESSAGES.map((qm) => (
          <Button
            key={qm}
            size="small"
            variant="outlined"
            onClick={() => void handleSend(qm)}
            disabled={sending}
            sx={{
              borderRadius: 5,
              textTransform: 'none',
              fontSize: '0.68rem',
              fontWeight: 600,
              py: 0.25,
              px: 1,
              borderColor: alpha(brand[300], 0.5),
              color: brand[700],
              '&:hover': { bgcolor: brand[50] },
            }}
          >
            {qm}
          </Button>
        ))}
      </Box>

      {/* Custom message */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Write a custom message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleSend();
          }}
          disabled={sending}
          slotProps={{ htmlInput: { maxLength: 200 } }}
        />
        <Button
          variant="contained"
          aria-label="Send encouragement"
          onClick={() => void handleSend()}
          disabled={sending || !message.trim()}
          sx={{
            minWidth: 'auto',
            px: 1.5,
            borderRadius: 2,
            background: `linear-gradient(135deg, ${brand[400]}, ${accent[300]})`,
          }}
        >
          {sending ? (
            <CircularProgress size={16} sx={{ color: 'white' }} />
          ) : (
            <SendIcon sx={{ fontSize: 16 }} />
          )}
        </Button>
      </Box>

      {sent && (
        <Alert severity="success" sx={{ mt: 1.5, py: 0, fontSize: '0.75rem' }}>
          {emoji} Encouragement sent to all members!
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mt: 1.5, py: 0, fontSize: '0.75rem' }}>
          {error}
        </Alert>
      )}
    </Box>
  );
}

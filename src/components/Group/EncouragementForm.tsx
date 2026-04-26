'use client';
import SendIcon from '@mui/icons-material/Send';
import { Box, Button, CircularProgress, TextField, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useState } from 'react';

const EMOJI_OPTIONS = ['⭐', '❤️', '✨', '🔥', '🏆', '👏', '🌈', '🚀'];
const QUICK_MESSAGES = ['Great job!', 'Keep going!', "I'm proud of you!", 'Amazing progress!'];

interface EncouragementFormProps {
  memberId: string;
  memberName: string;
  onSend: (memberId: string, message: string, emoji?: string) => Promise<void>;
}

export function EncouragementForm({ memberId, memberName, onSend }: EncouragementFormProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const [message, setMessage] = useState('');
  const [emoji, setEmoji] = useState('⭐');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async (text?: string) => {
    const msg = text ?? message.trim();
    if (!msg) return;
    setSending(true);
    try {
      await onSend(memberId, msg, emoji);
      setMessage('');
      setSent(true);
      setTimeout(() => setSent(false), 2500);
    } catch {
      // error handling in parent
    } finally {
      setSending(false);
    }
  };

  return (
    <Box
      sx={{
        p: 2,
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
          mb: 1,
        }}
      >
        Send Encouragement to {memberName}
      </Typography>

      {/* Emoji picker */}
      <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
        {EMOJI_OPTIONS.map((e) => (
          <Box
            key={e}
            onClick={() => setEmoji(e)}
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              border: `2px solid ${emoji === e ? brand[500] : 'transparent'}`,
              bgcolor: emoji === e ? alpha(brand[100], 0.8) : 'transparent',
              fontSize: '1rem',
              transition: 'all 0.15s ease',
              '&:hover': { bgcolor: alpha(brand[100], 0.6) },
            }}
          >
            {e}
          </Box>
        ))}
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
        <Typography sx={{ mt: 1, fontSize: '0.72rem', color: '#22C55E', fontWeight: 600 }}>
          {emoji} Encouragement sent!
        </Typography>
      )}
    </Box>
  );
}

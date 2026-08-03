'use client';
import SendIcon from '@mui/icons-material/Send';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { alpha, useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { EncouragementEmojiPicker } from './EncouragementEmojiPicker';

interface GroupEncouragementFormProps {
  members: { id: string; username: string }[];
  onSend: (memberId: string, message: string, emoji?: string) => Promise<unknown>;
}

export function GroupEncouragementForm({ members, onSend }: GroupEncouragementFormProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const t = useTranslations('Group.groupEncouragementForm');
  const QUICK_MESSAGES = [
    t('quickGreatJob'),
    t('quickKeepGoing'),
    t('quickProudOfYou'),
    t('quickAmazingProgress'),
  ];
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
      setError(t('failedToSendToSome'));
    } finally {
      setSending(false);
    }
  };

  if (members.length === 0) return null;

  return (
    <Box>
      <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mb: 1.5 }}>
        {t('sendToMembersDescription', { count: members.length })}
      </Typography>

      {/* Emoji picker */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <EncouragementEmojiPicker value={emoji} onChange={setEmoji} />
        <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
          {t('tapToChangeEmoji')}
        </Typography>
      </Box>

      {/* Quick messages */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
        {QUICK_MESSAGES.map((qm) => (
          <Button
            key={qm}
            size="small"
            variant="outlined"
            onClick={() => void handleSend(qm)}
            disabled={sending}
            sx={{
              borderRadius: theme.radii.pill,
              textTransform: 'none',
              fontSize: '0.76rem',
              fontWeight: 600,
              py: 0.35,
              px: 1.25,
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
          placeholder={t('writeCustomMessage')}
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
          aria-label={t('sendEncouragementAriaLabel')}
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
          {emoji} {t('sentToAllMembers')}
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

'use client';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { StyledDialog } from '@/components/StyledDialog';

import { EncouragementEmojiPicker } from '../EncouragementEmojiPicker';
import { timeAgo } from '../timeAgo';
import { useQuickSend } from '../useQuickSend';

interface QuickNudgeTarget {
  id: string;
  name: string;
  lastNudgedAt: string | null;
}

interface QuickNudgeDialogProps {
  open: boolean;
  target: QuickNudgeTarget | null;
  onClose: () => void;
  onSend: (memberId: string, message: string, emoji?: string) => Promise<unknown>;
  /** Fires after a successful send; the parent closes the dialog and confirms with a toast. */
  onSent: (emoji: string) => void;
}

const DEFAULT_EMOJI = '💪';

export function QuickNudgeDialog({ open, target, onClose, onSend, onSent }: QuickNudgeDialogProps) {
  const t = useTranslations('Group.needsAttention');
  const tForm = useTranslations('Group.groupEncouragementForm');
  const tc = useTranslations('Common');
  const tTime = useTranslations('Group.timeAgo');
  const [message, setMessage] = useState('');
  const [emoji, setEmoji] = useState(DEFAULT_EMOJI);
  const [error, setError] = useState<string | null>(null);
  const { sending, send } = useQuickSend(onSend);

  // One instance serves every learner, so each open starts from a clean slate.
  useEffect(() => {
    if (open) {
      setMessage(t('nudgeDefaultMessage'));
      setEmoji(DEFAULT_EMOJI);
      setError(null);
    }
  }, [open, t]);

  if (!target) return null;

  const handleSend = async () => {
    const msg = message.trim();
    if (!msg) return;
    setError(null);
    const ok = await send([target.id], msg, emoji);
    if (ok) onSent(emoji);
    else setError(tForm('failedToSendToSome'));
  };

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      title={t('nudgeDialogTitle', { name: target.name })}
      maxWidth="xs"
      actions={
        <>
          <Button onClick={onClose} disabled={sending}>
            {tc('cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleSend()}
            disabled={sending || !message.trim()}
          >
            {sending ? (
              <CircularProgress size={16} sx={{ color: 'white' }} />
            ) : (
              t('sendNudgeAction')
            )}
          </Button>
        </>
      }
    >
      {target.lastNudgedAt && (
        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 1 }}>
          {t('lastNudgedAt', { date: timeAgo(target.lastNudgedAt, tTime) })}
        </Typography>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <EncouragementEmojiPicker value={emoji} onChange={setEmoji} />
      </Box>

      <TextField
        fullWidth
        size="small"
        multiline
        minRows={2}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        disabled={sending}
        slotProps={{ htmlInput: { maxLength: 200 } }}
      />

      {error && (
        <Alert severity="error" sx={{ mt: 1.5, py: 0, fontSize: '0.75rem' }}>
          {error}
        </Alert>
      )}
    </StyledDialog>
  );
}

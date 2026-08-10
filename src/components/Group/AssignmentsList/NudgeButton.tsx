'use client';
import CheckIcon from '@mui/icons-material/Check';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { useQuickSend } from '../useQuickSend';

interface NudgeButtonProps {
  memberId: string;
  memberName: string;
  message: string;
  onSend: (memberId: string, message: string, emoji?: string) => Promise<unknown>;
  /** Called once the send resolves successfully, so the row can update its "last nudged" text without a refetch. */
  onSent?: () => void;
}

export function NudgeButton({ memberId, memberName, message, onSend, onSent }: NudgeButtonProps) {
  const t = useTranslations('Group.assignmentsList');
  const { sending, sent, send } = useQuickSend(onSend);
  const [error, setError] = useState(false);

  const handleSend = async () => {
    setError(false);
    const ok = await send([memberId], message);
    if (ok) onSent?.();
    else setError(true);
  };

  if (sent) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, flexShrink: 0 }}>
        <CheckIcon sx={{ fontSize: 14, color: 'success.main' }} aria-hidden />
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'success.main' }}>
          {t('nudgeSentShort')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
      <Button
        size="small"
        variant="text"
        onClick={() => void handleSend()}
        disabled={sending}
        aria-label={t('nudgeAria', { name: memberName })}
        sx={{ textTransform: 'none', fontSize: '0.72rem', fontWeight: 700, minWidth: 0, px: 0.75 }}
      >
        {sending ? <CircularProgress size={12} /> : t('nudgeAction')}
      </Button>
      {error && (
        <Typography sx={{ fontSize: '0.68rem', color: 'error.main' }}>
          {t('nudgeFailed')}
        </Typography>
      )}
    </Box>
  );
}

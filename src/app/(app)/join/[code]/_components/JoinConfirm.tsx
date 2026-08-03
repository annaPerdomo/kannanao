'use client';

import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { joinWithCurrentAccount } from './joinRequests';

interface JoinConfirmProps {
  code: string;
  accountName: string;
  /** Already learning in another group — this one is added alongside it. */
  alreadyInAGroup: boolean;
  onUseAnotherAccount: () => void;
}

/** Signed-in path: one button that puts this existing account into the group. */
export function JoinConfirm({
  code,
  accountName,
  alreadyInAGroup,
  onUseAnotherAccount,
}: JoinConfirmProps) {
  const t = useTranslations('Group.joinPage');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    setBusy(true);
    setError(null);
    const result = await joinWithCurrentAccount(code);
    if (result) {
      setError(t(`joinErrors.${result.code}`) || result.message);
      setBusy(false);
      return;
    }
    // Full-document navigation so the server re-renders with the new profile
    // (account type, organizer, group) instead of the cached signed-in shell.
    window.location.assign('/');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography sx={{ textAlign: 'center', fontSize: '0.88rem', color: 'text.secondary' }}>
        {t.rich('signedInAs', {
          name: accountName,
          bold: (chunks) => <strong>{chunks}</strong>,
        })}
      </Typography>
      <Typography sx={{ textAlign: 'center', fontSize: '0.82rem', color: 'text.secondary' }}>
        {t('keepsYourStuff')}
      </Typography>

      {alreadyInAGroup && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          {t('joiningAnotherGroup')}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Button
        variant="contained"
        onClick={handleJoin}
        disabled={busy}
        sx={{
          bgcolor: 'primary.dark',
          color: '#fff',
          fontFamily: (theme) => theme.fonts.display,
          textTransform: 'none',
          borderRadius: 6,
          '&:hover': { bgcolor: 'primary.dark', filter: 'brightness(0.9)' },
        }}
      >
        {busy ? <CircularProgress size={20} color="inherit" /> : t('joinWithThisAccount')}
      </Button>

      <Button
        variant="text"
        onClick={onUseAnotherAccount}
        disabled={busy}
        sx={{ textTransform: 'none', fontSize: '0.82rem' }}
      >
        {t('useAnotherAccount')}
      </Button>
    </Box>
  );
}

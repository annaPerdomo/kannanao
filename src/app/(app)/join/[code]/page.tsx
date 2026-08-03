'use client';

import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';

import { CreateAccountForm } from './_components/CreateAccountForm';
import { JoinCard } from './_components/JoinCard';
import { JoinConfirm } from './_components/JoinConfirm';
import { JOIN_ERROR_CODES } from './_components/joinRequests';
import { SignInAndJoinForm } from './_components/SignInAndJoinForm';

export default function JoinPage() {
  const t = useTranslations('Group.joinPage');
  const params = useParams();
  const router = useRouter();
  const code = (params?.code as string) ?? '';

  const { user, displayName, organizerId, loading: authLoading, signOut } = useAuth();

  const [validating, setValidating] = useState(true);
  const [valid, setValid] = useState(false);
  const [invalidReason, setInvalidReason] = useState('');
  const [organizerName, setOrganizerName] = useState('');
  const [groupName, setGroupName] = useState<string | null>(null);

  /**
   * Picked once from the initial auth state, then sticky: signing in from the
   * sign-in form would otherwise swap this page to the confirm card underneath
   * a submit that is still running.
   */
  const [mode, setMode] = useState<'confirm' | 'create' | 'signIn' | null>(null);
  const [switchingAccount, setSwitchingAccount] = useState(false);

  useEffect(() => {
    if (authLoading || mode !== null) return;
    setMode(user ? 'confirm' : 'create');
  }, [authLoading, user, mode]);

  useEffect(() => {
    async function validate() {
      try {
        const res = await fetch(`/api/join?code=${encodeURIComponent(code)}`);
        const data = await res.json();
        if (data.valid) {
          setValid(true);
          setOrganizerName(data.organizerName);
          if (data.groupName) setGroupName(data.groupName);
        } else {
          setValid(false);
          const localised = JOIN_ERROR_CODES.includes(data.code)
            ? t(`joinErrors.${data.code}`)
            : '';
          setInvalidReason(localised || data.reason || t('invalidInviteCode'));
        }
      } catch {
        setInvalidReason(t('unableToVerify'));
      } finally {
        setValidating(false);
      }
    }
    void validate();
  }, [code]);

  const handleUseAnotherAccount = async () => {
    setSwitchingAccount(true);
    await signOut();
    setMode('signIn');
    setSwitchingAccount(false);
  };

  if (validating || authLoading || switchingAccount || mode === null) {
    return (
      <Box
        sx={{
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!valid) {
    return (
      <JoinCard>
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: '3rem', mb: 1 }}>😔</Typography>
          <Typography sx={{ fontSize: '1rem', color: 'text.primary', fontWeight: 600, mb: 1 }}>
            {t('inviteNotAvailable')}
          </Typography>
          <Typography sx={{ fontSize: '0.88rem', color: 'text.secondary', mb: 2 }}>
            {invalidReason}
          </Typography>
          <Button
            variant="outlined"
            onClick={() => router.push('/login')}
            sx={{ textTransform: 'none', borderRadius: 6 }}
          >
            {t('goToSignIn')}
          </Button>
        </Box>
      </JoinCard>
    );
  }

  return (
    <JoinCard>
      <Typography
        sx={{
          textAlign: 'center',
          fontSize: '0.88rem',
          color: 'text.secondary',
          mb: 3,
        }}
      >
        {groupName
          ? t.rich('joiningWithGroup', {
              organizerName,
              groupName,
              bold: (chunks) => <strong>{chunks}</strong>,
            })
          : t.rich('joiningNoGroup', {
              organizerName,
              bold: (chunks) => <strong>{chunks}</strong>,
            })}
      </Typography>

      {mode === 'confirm' && user ? (
        <JoinConfirm
          code={code}
          accountName={displayName || user.email?.split('@')[0] || t('yourAccount')}
          switchingGroups={organizerId !== null}
          onUseAnotherAccount={handleUseAnotherAccount}
        />
      ) : mode === 'signIn' ? (
        <SignInAndJoinForm code={code} onSwitchToCreate={() => setMode('create')} />
      ) : (
        <CreateAccountForm code={code} onSwitchToSignIn={() => setMode('signIn')} />
      )}
    </JoinCard>
  );
}

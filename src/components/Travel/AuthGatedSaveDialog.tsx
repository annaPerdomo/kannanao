'use client';

import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import LoginIcon from '@mui/icons-material/Login';
import { Button, Stack, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { StyledDialog } from '@/components/StyledDialog';
import { useAuth } from '@/contexts/AuthContext';

import { SaveToDeckDialog } from './SaveToDeckDialog';

interface AuthGatedSaveDialogProps {
  open: boolean;
  onClose: () => void;
  phrases: Array<{ japanese: string; romaji: string; english: string }>;
  onSaved: () => void;
  defaultDeckName?: string;
}

export function AuthGatedSaveDialog(props: AuthGatedSaveDialogProps) {
  const t = useTranslations('Travel.authGatedSave');
  const { user } = useAuth();
  const router = useRouter();

  if (props.open && !user) {
    return (
      <StyledDialog
        open={props.open}
        onClose={props.onClose}
        title={t('title')}
        subtitle={t('subtitle')}
        icon={<BookmarkAddIcon sx={{ fontSize: 22, color: 'text.primary' }} />}
        titleId="auth-gated-save-title"
        actions={
          <Stack direction="row" spacing={1}>
            <Button onClick={props.onClose} sx={{ textTransform: 'none' }}>
              {t('maybeLater')}
            </Button>
            <Button
              variant="contained"
              startIcon={<LoginIcon sx={{ fontSize: 16 }} />}
              onClick={() => {
                props.onClose();
                router.push('/login');
              }}
              sx={{ textTransform: 'none', borderRadius: 2 }}
            >
              {t('signIn')}
            </Button>
          </Stack>
        }
      >
        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
          {t('body')}
        </Typography>
      </StyledDialog>
    );
  }

  return <SaveToDeckDialog {...props} />;
}

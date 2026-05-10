'use client';

import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd';
import LoginIcon from '@mui/icons-material/Login';
import { Button, Stack, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';

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
  const { user } = useAuth();
  const router = useRouter();

  if (props.open && !user) {
    return (
      <StyledDialog
        open={props.open}
        onClose={props.onClose}
        title="Sign in to save phrases"
        subtitle="Save phrases to your personal study deck"
        icon={<BookmarkAddIcon sx={{ fontSize: 22, color: 'text.primary' }} />}
        titleId="auth-gated-save-title"
        actions={
          <Stack direction="row" spacing={1}>
            <Button onClick={props.onClose} sx={{ textTransform: 'none' }}>
              Maybe later
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
              Sign in
            </Button>
          </Stack>
        }
      >
        <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
          Sign in to save travel phrases into flashcard decks you can study and practice anytime.
        </Typography>
      </StyledDialog>
    );
  }

  return <SaveToDeckDialog {...props} />;
}

'use client';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { useAuth } from '@/contexts/AuthContext';

import { MIN_SENTENCES } from './constants';

export function ErrorState({ error, onExit }: { error: string; onExit: () => void }) {
  const tBack = useTranslations('Common');
  return (
    <Box sx={{ textAlign: 'center', py: 4 }}>
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
      <Button onClick={onExit} variant="outlined">
        {tBack('back')}
      </Button>
    </Box>
  );
}

export function EmptyState({
  onExit,
  onGenerate,
  error,
}: {
  onExit: () => void;
  onGenerate: () => void;
  error: string | null;
}) {
  const t = useTranslations('Practice.kotobaBubble');
  const tBack = useTranslations('Common');
  const { isMemberAccount } = useAuth();

  return (
    <Box sx={{ textAlign: 'center', py: 6 }}>
      <Typography sx={{ fontSize: '3rem', mb: 2 }}>🫧</Typography>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
        {t('title')}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 360, mx: 'auto' }}>
        {isMemberAccount ? t('memberEmptyMsg') : t('organizerEmptyMsg')}
      </Typography>
      {!isMemberAccount && (
        <Button
          variant="contained"
          size="large"
          onClick={onGenerate}
          startIcon={<AutoAwesomeIcon />}
          sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 700, px: 4 }}
        >
          {t('generatePractice')}
        </Button>
      )}
      {error && (
        <Alert severity="error" sx={{ mt: 2, maxWidth: 400, mx: 'auto' }}>
          {error}
        </Alert>
      )}
      <Box sx={{ mt: 2 }}>
        <Button onClick={onExit} color="inherit" size="small">
          {tBack('back')}
        </Button>
      </Box>
    </Box>
  );
}

export function NotEnoughState({ onExit }: { onExit: () => void }) {
  const t = useTranslations('Practice.kotobaBubble');
  const tBack = useTranslations('Common');
  return (
    <Box sx={{ textAlign: 'center', py: 6 }}>
      <Typography color="text.secondary">
        {t('notEnoughSentences', { count: MIN_SENTENCES })}
      </Typography>
      <Button onClick={onExit} sx={{ mt: 2 }} variant="outlined">
        {tBack('back')}
      </Button>
    </Box>
  );
}

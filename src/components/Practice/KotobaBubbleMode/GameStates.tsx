'use client';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { useAuth } from '@/contexts/AuthContext';
import type { QuestHandoff } from '@/contexts/QuestHandoffContext';

import { MIN_SENTENCES } from './constants';

function NextOrBack({ handoff, onExit }: { handoff?: QuestHandoff | null; onExit: () => void }) {
  const tBack = useTranslations('Common');
  if (!handoff) {
    return (
      <Button onClick={onExit} variant="outlined">
        {tBack('back')}
      </Button>
    );
  }
  return (
    <Stack direction="row" spacing={1.5} justifyContent="center">
      <Button
        variant="contained"
        onClick={handoff.onNext}
        sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 700 }}
      >
        {handoff.label}
      </Button>
      <Button onClick={onExit} variant="text">
        {tBack('back')}
      </Button>
    </Stack>
  );
}

export function ErrorState({
  error,
  onExit,
  handoff,
}: {
  error: string;
  onExit: () => void;
  handoff?: QuestHandoff | null;
}) {
  return (
    <Box sx={{ textAlign: 'center', py: 4 }}>
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
      <NextOrBack handoff={handoff} onExit={onExit} />
    </Box>
  );
}

export function EmptyState({
  onExit,
  onGenerate,
  error,
  handoff,
}: {
  onExit: () => void;
  onGenerate: () => void;
  error: string | null;
  handoff?: QuestHandoff | null;
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
      {handoff ? (
        <Button
          variant="contained"
          onClick={handoff.onNext}
          sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 700, px: 4 }}
        >
          {handoff.label}
        </Button>
      ) : (
        !isMemberAccount && (
          <Button
            variant="contained"
            size="large"
            onClick={onGenerate}
            startIcon={<AutoAwesomeIcon />}
            sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 700, px: 4 }}
          >
            {t('generatePractice')}
          </Button>
        )
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

export function NotEnoughState({
  onExit,
  handoff,
}: {
  onExit: () => void;
  handoff?: QuestHandoff | null;
}) {
  const t = useTranslations('Practice.kotobaBubble');
  return (
    <Box sx={{ textAlign: 'center', py: 6 }}>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        {t('notEnoughSentences', { count: MIN_SENTENCES })}
      </Typography>
      <NextOrBack handoff={handoff} onExit={onExit} />
    </Box>
  );
}

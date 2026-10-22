'use client';
import ChatBubbleOutlineRounded from '@mui/icons-material/ChatBubbleOutlineRounded';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

import { SectionCard } from '@/components/Group/SectionCard';
import { MIN_SENTENCES } from '@/components/Practice/KotobaBubbleMode/constants';
import { useAuth } from '@/contexts/AuthContext';
import { usePracticeSentences } from '@/hooks/usePracticeSentences';

interface SentencesStatusProps {
  deckId: string;
  compact?: boolean;
}

export function SentencesStatus({ deckId, compact = false }: SentencesStatusProps) {
  const t = useTranslations('Materials.handoutPage.sentences');
  const { isMemberAccount } = useAuth();
  const {
    sentences,
    loading,
    generating,
    error,
    justGenerated,
    generate,
    regenerate,
    clearJustGenerated,
  } = usePracticeSentences(deckId);

  useEffect(() => {
    if (!justGenerated) return;
    const id = setTimeout(clearJustGenerated, 4000);
    return () => clearTimeout(id);
  }, [justGenerated, clearJustGenerated]);

  if (isMemberAccount || loading) return null;

  const loadFailed = !!error && sentences.length === 0 && !justGenerated && !generating;

  if (loadFailed) {
    const alert = <Alert severity="error">{error}</Alert>;
    if (compact) return alert;
    return (
      <SectionCard title={t('title')} icon={<ChatBubbleOutlineRounded sx={{ fontSize: 20 }} />}>
        {alert}
      </SectionCard>
    );
  }

  const ready = sentences.length >= MIN_SENTENCES;

  const row = ready ? (
    <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      <Typography
        variant={compact ? 'body2' : undefined}
        sx={{ fontSize: compact ? undefined : '0.85rem' }}
      >
        {!compact && '✅ '}
        {t('ready', { count: sentences.length })}
      </Typography>
      <Button
        component={Link}
        href={`/deck/${deckId}/practice/kotoba-bubble`}
        size="small"
        sx={{ textTransform: 'none', fontWeight: 700, px: 0 }}
      >
        {t('open')}
      </Button>
    </Stack>
  ) : (
    <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      <Typography
        variant={compact ? 'body2' : undefined}
        sx={{ fontSize: compact ? undefined : '0.85rem' }}
      >
        {!compact && '💬 '}
        {t('missing')}
      </Typography>
      <Button
        variant="outlined"
        size="small"
        disabled={generating}
        startIcon={generating ? <CircularProgress size={14} /> : undefined}
        onClick={() => {
          clearJustGenerated();
          void (sentences.length === 0 ? generate() : regenerate());
        }}
        sx={{ textTransform: 'none', fontWeight: 700 }}
      >
        {t('make')}
      </Button>
    </Stack>
  );

  const content = (
    <Stack spacing={1}>
      {row}
      {error && <Alert severity="error">{error}</Alert>}
      {justGenerated && <Alert severity="success">{t('made', { count: sentences.length })}</Alert>}
    </Stack>
  );

  if (compact) return content;

  return (
    <SectionCard title={t('title')} icon={<ChatBubbleOutlineRounded sx={{ fontSize: 20 }} />}>
      {content}
    </SectionCard>
  );
}

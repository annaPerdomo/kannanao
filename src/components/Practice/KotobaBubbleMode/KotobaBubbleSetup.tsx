'use client';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import EditNoteIcon from '@mui/icons-material/EditNote';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';

import { Loading } from '@/components/Loading';
import { BatchPicker } from '@/components/Practice/BatchPicker';
import { useAuth } from '@/contexts/AuthContext';
import { usePracticeSentences } from '@/hooks/usePracticeSentences';

import { SentenceReviewDialog } from './SentenceReviewDialog';

interface KotobaBubbleSetupProps {
  deckId: string;
  totalCards: number;
  onSelect: (batchSize: number) => void;
}

export function KotobaBubbleSetup({ deckId, totalCards, onSelect }: KotobaBubbleSetupProps) {
  const { isMemberAccount } = useAuth();

  const {
    sentences,
    loading,
    generating,
    saving,
    error,
    hasContent,
    generate,
    regenerate,
    justGenerated,
    clearJustGenerated,
    updateSentences,
  } = usePracticeSentences(deckId);

  const [reviewOpen, setReviewOpen] = useState(false);

  // Auto-open review dialog after generation
  useEffect(() => {
    if (justGenerated && hasContent) {
      setReviewOpen(true);
      clearJustGenerated();
    }
  }, [justGenerated, hasContent, clearJustGenerated]);

  const handleRegenerate = useCallback(() => {
    regenerate();
  }, [regenerate]);

  // Loading state
  if (loading) {
    return <Loading message="Loading Kotoba Bubble..." />;
  }

  if (generating) {
    return <Loading message="Generating practice sentences..." />;
  }

  // No content — show generate prompt
  if (!hasContent) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography sx={{ fontSize: '3rem', mb: 2 }}>🫧</Typography>
        <Typography variant="h5" sx={{ mb: 0.5, fontWeight: 700, color: 'text.primary' }}>
          Kotoba Bubble
        </Typography>
        <Typography sx={{ mb: 3, color: 'text.secondary', maxWidth: 360, mx: 'auto' }}>
          {isMemberAccount
            ? "Your teacher hasn't set up this game for this deck yet. Ask them to generate practice sentences!"
            : "Generate fun practice sentences from this deck's vocabulary. The AI will create natural conversations your student can practice with!"}
        </Typography>
        {!isMemberAccount && (
          <Button
            variant="contained"
            size="large"
            onClick={generate}
            startIcon={<AutoAwesomeIcon />}
            sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 700, px: 4 }}
          >
            Generate Practice
          </Button>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 2, maxWidth: 400, mx: 'auto' }}>
            {error}
          </Alert>
        )}
      </Box>
    );
  }

  // Has content — show batch picker + organizer controls
  const organizerControls = !isMemberAccount ? (
    <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 3 }}>
      <Button
        size="small"
        startIcon={<EditNoteIcon />}
        onClick={() => setReviewOpen(true)}
        sx={{ textTransform: 'none', color: 'text.secondary' }}
      >
        Review ({sentences.length})
      </Button>
      <Button
        size="small"
        startIcon={<RefreshIcon />}
        onClick={handleRegenerate}
        disabled={generating}
        sx={{ textTransform: 'none', color: 'text.secondary' }}
      >
        Regenerate
      </Button>
    </Stack>
  ) : undefined;

  return (
    <>
      <BatchPicker
        totalCards={totalCards}
        mode="kotoba-bubble"
        onSelect={onSelect}
        icon={<Typography sx={{ fontSize: '3rem', lineHeight: 1, mb: 2 }}>🫧</Typography>}
        footer={organizerControls}
      />

      {error && (
        <Alert severity="error" sx={{ mt: 2, maxWidth: 400, mx: 'auto' }}>
          {error}
        </Alert>
      )}

      <SentenceReviewDialog
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        sentences={sentences}
        saving={saving}
        onSave={updateSentences}
      />
    </>
  );
}

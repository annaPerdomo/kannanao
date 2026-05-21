'use client';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import EditNoteIcon from '@mui/icons-material/EditNote';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Alert, Box, Button, Chip, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useCallback, useEffect, useState } from 'react';

import { Loading } from '@/components/Loading';
import { useAuth } from '@/contexts/AuthContext';
import { usePracticeSentences } from '@/hooks/usePracticeSentences';

import { SentenceReviewDialog } from './SentenceReviewDialog';

interface KotobaBubbleSetupProps {
  deckId: string;
  totalCards: number;
  onSelect: (batchSize: number) => void;
  onBack: () => void;
}

interface BatchOption {
  size: number;
  label: string;
  desc: string;
  recommended?: boolean;
}

function getOptions(totalCards: number): BatchOption[] {
  const maxBatch = 15;
  const options: BatchOption[] = [];
  if (totalCards > 5) options.push({ size: 5, label: '5 cards', desc: 'Quick review' });
  if (totalCards > 10)
    options.push({ size: 10, label: '10 cards', desc: 'Recommended', recommended: true });
  if (maxBatch >= 20 && totalCards > 20)
    options.push({ size: 20, label: '20 cards', desc: 'Challenge' });
  options.push({ size: totalCards, label: `All ${totalCards} cards`, desc: 'Full deck' });
  return options;
}

export function KotobaBubbleSetup({
  deckId,
  totalCards,
  onSelect,
  onBack,
}: KotobaBubbleSetupProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
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
        <Box sx={{ mt: 2 }}>
          <Button onClick={onBack} sx={{ color: 'text.secondary' }} size="small">
            Back
          </Button>
        </Box>
      </Box>
    );
  }

  // Has content — show batch picker + organizer controls
  const options = getOptions(totalCards);

  return (
    <Box sx={{ textAlign: 'center', py: 4 }}>
      <Typography sx={{ fontSize: '3rem', lineHeight: 1, mb: 2 }}>🫧</Typography>

      <Typography variant="h5" sx={{ mb: 0.5, fontWeight: 700, color: 'text.primary' }}>
        How many cards?
      </Typography>
      <Typography sx={{ mb: 3, color: 'text.secondary' }}>
        This deck has {totalCards} cards. Pick a batch size to practice.
      </Typography>

      <Stack spacing={1.5} sx={{ maxWidth: 340, mx: 'auto' }}>
        {options.map((opt) => (
          <Button
            key={opt.size}
            variant={opt.recommended ? 'contained' : 'outlined'}
            size="large"
            onClick={() => onSelect(opt.size)}
            sx={{
              justifyContent: 'space-between',
              px: 3,
              py: 1.5,
              borderRadius: 2.5,
              textTransform: 'none',
              fontSize: '1rem',
              ...(opt.recommended
                ? {}
                : {
                    borderColor: alpha(brand[300], 0.4),
                    color: 'text.primary',
                    '&:hover': {
                      borderColor: brand[500],
                      bgcolor: alpha(brand[300], 0.12),
                    },
                  }),
            }}
          >
            <span>{opt.label}</span>
            <Chip
              label={opt.desc}
              size="small"
              variant="outlined"
              sx={{
                pointerEvents: 'none',
                borderColor: opt.recommended ? 'rgba(255,255,255,0.5)' : alpha(brand[300], 0.3),
                color: opt.recommended ? 'inherit' : 'text.secondary',
                fontSize: '0.75rem',
              }}
            />
          </Button>
        ))}
      </Stack>

      {/* Organizer controls */}
      {!isMemberAccount && (
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
      )}

      <Typography
        variant="caption"
        sx={{ display: 'block', mt: 2.5, maxWidth: 300, mx: 'auto', color: 'text.secondary' }}
      >
        Wrong answers come back for review so you master every card
      </Typography>

      <Button onClick={onBack} sx={{ mt: 2, color: 'text.secondary' }} size="small">
        Back
      </Button>

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
    </Box>
  );
}

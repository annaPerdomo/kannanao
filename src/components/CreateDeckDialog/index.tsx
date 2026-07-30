'use client';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import {
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';

import { AddCardsSection } from '@/components/AddCards';
import { AddExistingCardsDialog } from '@/components/AddExistingCardsDialog';
import { Loading } from '@/components/Loading';
import { PdfImportModal } from '@/components/PdfImportModal';
import { ReviewCardsDialog } from '@/components/ReviewCardsDialog';
import { StyledDialog } from '@/components/StyledDialog';
import { useAuth } from '@/contexts/AuthContext';

import { useCreateDeckFlow } from './useCreateDeckFlow';

export function CreateDeckDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations('Deck.createDeckDialog');
  const tCommon = useTranslations('Common');
  const { palette } = useTheme();
  const { brand, surfaces } = palette;
  const { user } = useAuth();

  const flow = useCreateDeckFlow(onClose);
  const { busy, creating, generating, canGenerate, review } = flow;

  return (
    <>
      <StyledDialog
        open={open}
        onClose={busy ? () => {} : onClose}
        title={t('title')}
        subtitle={t('subtitle')}
        closeDisabled={busy}
        actions={
          <>
            <Button
              onClick={onClose}
              disabled={busy}
              sx={{ color: 'text.secondary', textTransform: 'none' }}
            >
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={flow.handleCreate}
              disabled={!flow.name.trim() || busy}
              variant="contained"
              startIcon={
                creating ? (
                  <CircularProgress size={13} color="inherit" />
                ) : canGenerate ? (
                  <AutoAwesomeIcon sx={{ fontSize: 14 }} />
                ) : undefined
              }
              sx={{
                bgcolor: brand[700],
                color: '#fff',
                textTransform: 'none',
                borderRadius: 6,
                px: 2.5,
                '&:hover': { bgcolor: brand[800] },
                '&:disabled': { bgcolor: alpha(brand[700], 0.2), color: alpha('#fff', 0.5) },
              }}
            >
              {creating ? t('creating') : t('create')}
            </Button>
          </>
        }
      >
        {generating ? (
          <Loading message={t('generating')} />
        ) : (
          <>
            <TextField
              label={t('deckNameLabel')}
              value={flow.name}
              onChange={(e) => flow.setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !canGenerate) void flow.handleCreate();
              }}
              fullWidth
              autoFocus
              disabled={busy}
              sx={{ mb: 2 }}
            />
            <TextField
              label={t('descriptionLabel')}
              value={flow.description}
              onChange={(e) => flow.setDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
              disabled={busy}
              sx={{ mb: 2 }}
            />

            {/* Pin toggle */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: 2.5,
                px: 1.5,
                py: 1,
                borderRadius: 3,
                border: `1.5px solid ${flow.pinToHome ? alpha(brand[400], 0.55) : alpha(brand[300], 0.3)}`,
                bgcolor: flow.pinToHome ? alpha(brand[50], 0.8) : 'transparent',
                transition: 'all 0.18s ease',
                cursor: 'pointer',
              }}
              onClick={() => flow.setPinToHome(!flow.pinToHome)}
            >
              {flow.pinToHome ? (
                <PushPinIcon sx={{ fontSize: '1rem', color: brand[600], flexShrink: 0 }} />
              ) : (
                <PushPinOutlinedIcon
                  sx={{ fontSize: '1rem', color: alpha(brand[500], 0.55), flexShrink: 0 }}
                />
              )}
              <Box sx={{ flexGrow: 1 }}>
                <Typography
                  sx={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: flow.pinToHome ? brand[700] : 'text.secondary',
                    lineHeight: 1.2,
                  }}
                >
                  {t('pinToHome')}
                </Typography>
                <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
                  {t('pinToHomeHelper')}
                </Typography>
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={flow.pinToHome}
                    onChange={(e) => {
                      e.stopPropagation();
                      flow.setPinToHome(e.target.checked);
                    }}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: brand[600] },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        bgcolor: brand[400],
                      },
                    }}
                  />
                }
                label=""
                sx={{ m: 0 }}
                onClick={(e) => e.stopPropagation()}
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box sx={{ flexGrow: 1, height: '1px', bgcolor: alpha(brand[300], 0.3) }} />
              <Typography
                sx={{
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: alpha(brand[700], 0.7),
                }}
              >
                {t('addCardsOptional')}
              </Typography>
              <Box sx={{ flexGrow: 1, height: '1px', bgcolor: alpha(brand[300], 0.3) }} />
            </Box>

            <AddCardsSection
              words={flow.words}
              onWordsChange={flow.setWords}
              input={flow.input}
              onInputChange={flow.setInput}
              disabled={busy}
              error={flow.error}
              mainViewMode={flow.mainViewMode}
              onMainViewModeChange={flow.setMainViewMode}
              onAddExisting={flow.handleAddExisting}
              onImportPdf={flow.handleImportPdf}
              containerSx={{
                bgcolor: surfaces.input,
                border: `1.5px solid ${alpha(brand[300], 0.35)}`,
                borderRadius: '14px',
                p: 2,
                mb: 2,
              }}
              titleColor={brand[500]}
            />
          </>
        )}
      </StyledDialog>

      <AddExistingCardsDialog
        open={flow.pickerOpen}
        onClose={() => {
          flow.setPickerOpen(false);
          if (flow.createdDeckId) flow.navigateToDeck(flow.createdDeckId);
        }}
        targetDeckId={flow.createdDeckId ?? ''}
        userId={user?.id ?? ''}
        onConfirm={flow.handlePickerConfirm}
      />

      <PdfImportModal
        open={flow.pdfOpen}
        onClose={() => {
          flow.setPdfOpen(false);
          if (flow.createdDeckId) flow.navigateToDeck(flow.createdDeckId);
        }}
        onAddCards={flow.handlePdfCards}
      />

      <ReviewCardsDialog
        open={review.open}
        cards={review.cards}
        onClose={() => {
          // The deck already exists — drop the user into it rather than
          // stranding them behind a closed dialog.
          if (flow.createdDeckId) flow.navigateToDeck(flow.createdDeckId);
          else review.clear();
        }}
        onConfirm={flow.handleReviewConfirm}
      />
    </>
  );
}

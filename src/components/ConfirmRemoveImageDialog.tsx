'use client';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { Button, CircularProgress, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';

import { StyledDialog } from '@/components/StyledDialog';

interface ConfirmRemoveImageDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deleting?: boolean;
}

export function ConfirmRemoveImageDialog({
  open,
  onClose,
  onConfirm,
  deleting,
}: ConfirmRemoveImageDialogProps) {
  const t = useTranslations('Deck.confirmRemoveImageDialog');
  const tCommon = useTranslations('Common');
  const { palette } = useTheme();
  const { brand } = palette;

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      title={t('title')}
      subtitle={t('subtitle')}
      maxWidth="xs"
      closeDisabled={deleting}
      actions={
        <>
          <Button
            onClick={onClose}
            disabled={deleting}
            sx={{
              borderRadius: '10px',
              color: brand[700],
              fontWeight: 700,
              textTransform: 'none',
              fontSize: '0.8rem',
            }}
          >
            {tCommon('cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={onConfirm}
            disabled={deleting}
            startIcon={
              deleting ? (
                <CircularProgress size={13} sx={{ color: 'white' }} />
              ) : (
                <DeleteForeverIcon sx={{ fontSize: 15 }} />
              )
            }
            sx={{
              borderRadius: '10px',
              px: 2.5,
              fontWeight: 700,
              textTransform: 'none',
              fontSize: '0.8rem',
              bgcolor: '#EF4444',
              '&:hover': { bgcolor: '#DC2626' },
            }}
          >
            {deleting ? t('removing') : t('removeForever')}
          </Button>
        </>
      }
    >
      <Typography sx={{ fontSize: '0.85rem', color: alpha(brand[700], 0.8), lineHeight: 1.6 }}>
        {t('body')}
      </Typography>
    </StyledDialog>
  );
}

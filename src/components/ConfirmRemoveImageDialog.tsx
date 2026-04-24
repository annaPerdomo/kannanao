'use client';
import { Typography, Button, CircularProgress } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { StyledDialog } from '@/components/StyledDialog';

interface ConfirmRemoveImageDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deleting?: boolean;
}

export function ConfirmRemoveImageDialog({ open, onClose, onConfirm, deleting }: ConfirmRemoveImageDialogProps) {
  const { palette } = useTheme();
  const { brand } = palette;

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      title="Remove Image"
      subtitle="This action cannot be undone"
      maxWidth="xs"
      closeDisabled={deleting}
      actions={
        <>
          <Button
            onClick={onClose} disabled={deleting}
            sx={{ borderRadius: '10px', color: brand[700], fontWeight: 700, textTransform: 'none', fontSize: '0.8rem' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained" onClick={onConfirm} disabled={deleting}
            startIcon={deleting
              ? <CircularProgress size={13} sx={{ color: 'white' }} />
              : <DeleteForeverIcon sx={{ fontSize: 15 }} />
            }
            sx={{
              borderRadius: '10px', px: 2.5, fontWeight: 700, textTransform: 'none', fontSize: '0.8rem',
              bgcolor: '#EF4444',
              '&:hover': { bgcolor: '#DC2626' },
            }}
          >
            {deleting ? 'Removing...' : 'Remove Forever'}
          </Button>
        </>
      }
    >
      <Typography sx={{ fontSize: '0.85rem', color: alpha(brand[700], 0.8), lineHeight: 1.6 }}>
        This will permanently delete the image from storage. You won&apos;t be able to recover it.
      </Typography>
    </StyledDialog>
  );
}

'use client';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

interface EditNameDialogProps {
  open: boolean;
  onClose: () => void;
  nameInput: string;
  onNameInputChange: (value: string) => void;
  onSave: () => void;
  saving: boolean;
}

export function EditNameDialog({
  open, onClose, nameInput, onNameInputChange, onSave, saving,
}: EditNameDialogProps) {
  const { brand, surfaces } = useTheme().palette;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            borderRadius: 4,
            border: `1px solid ${alpha(brand[300], 0.35)}`,
            boxShadow: `0 8px 40px ${alpha(brand[700], 0.12)}`,
            bgcolor: surfaces.overlay,
            minWidth: 320,
          },
        },
      }}
    >
      <DialogTitle sx={{ fontFamily: '"DM Serif Display", serif', color: brand[700], pb: 1 }}>
        Edit your name
      </DialogTitle>
      <DialogContent sx={{ pt: '8px !important' }}>
        <TextField
          autoFocus
          fullWidth
          size="small"
          label="Display name"
          value={nameInput}
          onChange={(e) => onNameInputChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void onSave(); }}
          sx={{ mt: 0.5 }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button
          onClick={onClose}
          sx={{ color: 'text.secondary', textTransform: 'none', borderRadius: 6 }}
        >
          Cancel
        </Button>
        <Button
          onClick={onSave}
          disabled={saving || !nameInput.trim()}
          variant="contained"
          sx={{
            bgcolor: brand[700],
            color: '#fff',
            textTransform: 'none',
            borderRadius: 6,
            fontFamily: '"DM Serif Display", serif',
            '&:hover': { bgcolor: brand[800] },
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

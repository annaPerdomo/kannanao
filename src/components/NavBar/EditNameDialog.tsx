'use client';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';

import { StyledDialog } from '@/components/StyledDialog';

interface EditNameDialogProps {
  open: boolean;
  onClose: () => void;
  nameInput: string;
  onNameInputChange: (value: string) => void;
  onSave: () => void;
  saving: boolean;
}

export function EditNameDialog({
  open,
  onClose,
  nameInput,
  onNameInputChange,
  onSave,
  saving,
}: EditNameDialogProps) {
  const { brand } = useTheme().palette;

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      title="Edit your name"
      actions={
        <Stack direction="row" spacing={1}>
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
              '&:hover': { bgcolor: brand[800] },
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </Stack>
      }
    >
      <TextField
        autoFocus
        fullWidth
        size="small"
        label="Display name"
        value={nameInput}
        onChange={(e) => onNameInputChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void onSave();
        }}
        sx={{ mt: 0.5 }}
      />
    </StyledDialog>
  );
}

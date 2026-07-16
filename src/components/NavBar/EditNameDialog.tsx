'use client';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('Nav.editNameDialog');
  const tCommon = useTranslations('Common');
  const { brand } = useTheme().palette;

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      title={t('title')}
      actions={
        <Stack direction="row" spacing={1}>
          <Button
            onClick={onClose}
            sx={{ color: 'text.secondary', textTransform: 'none', borderRadius: 6 }}
          >
            {tCommon('cancel')}
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
            {saving ? t('saving') : tCommon('save')}
          </Button>
        </Stack>
      }
    >
      <TextField
        autoFocus
        fullWidth
        size="small"
        label={t('fieldLabel')}
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

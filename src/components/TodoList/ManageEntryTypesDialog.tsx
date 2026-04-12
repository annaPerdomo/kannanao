'use client';
import { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useTheme, alpha } from '@mui/material/styles';
import type { EntryType } from '@/types/todo';
import { DEFAULT_ENTRY_TYPES } from './helpers';

interface ManageEntryTypesDialogProps {
  open: boolean;
  onClose: () => void;
  allEntryTypes: EntryType[];
  onAddEntryType: (name: string, emoji: string, color: string) => Promise<EntryType>;
  onDeleteEntryType: (typeId: string) => void;
}

const TYPE_COLORS = [
  '#3B82F6', '#F59E0B', '#8B5CF6', '#10B981',
  '#EF4444', '#F97316', '#EC4899', '#06B6D4',
];

const defaultTypeIds = new Set(DEFAULT_ENTRY_TYPES.map((t) => t.id));

export function ManageEntryTypesDialog({
  open, onClose, allEntryTypes, onAddEntryType, onDeleteEntryType,
}: ManageEntryTypesDialogProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;

  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeEmoji, setNewTypeEmoji] = useState('🎉');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const customTypes = allEntryTypes.filter((t) => !defaultTypeIds.has(t.id));

  const handleAdd = useCallback(async () => {
    const name = newTypeName.trim();
    if (!name) return;
    setAdding(true);
    setAddError(null);
    setAddSuccess(false);
    try {
      const color = TYPE_COLORS[Math.floor(Math.random() * TYPE_COLORS.length)];
      await onAddEntryType(name, newTypeEmoji || '🎉', color);
      setNewTypeName('');
      setNewTypeEmoji('🎉');
      setAddSuccess(true);
      setTimeout(() => setAddSuccess(false), 2000);
    } catch {
      setAddError('Could not add type. Please try again.');
    } finally {
      setAdding(false);
    }
  }, [newTypeName, newTypeEmoji, onAddEntryType]);

  const handleDelete = useCallback(async (id: string) => {
    setDeleting(id);
    setDeleteError(null);
    try {
      onDeleteEntryType(id);
    } catch {
      setDeleteError('Could not delete type. Please try again.');
    } finally {
      setDeleting(null);
    }
  }, [onDeleteEntryType]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          background: `linear-gradient(160deg, ${alpha(brand[50], 0.97)} 0%, ${alpha(accent[50], 0.9)} 100%)`,
          border: `2px solid ${alpha(brand[300], 0.25)}`,
          boxShadow: `0 8px 32px ${alpha(brand[300], 0.2)}`,
        },
      }}
    >
      <DialogTitle sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        pb: 1, fontWeight: 800,
        background: `linear-gradient(90deg, ${brand[700]} 0%, ${accent[500]} 100%)`,
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
      }}>
        Manage Entry Types
        <IconButton size="small" onClick={onClose} sx={{ WebkitTextFillColor: 'initial', color: 'text.secondary' }}>
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1.5 }}>
        <Stack spacing={2}>
          {/* Default types (read-only) */}
          <Box>
            <Typography sx={{
              fontSize: '0.68rem', fontWeight: 800, color: 'text.disabled',
              mb: 0.75, textTransform: 'uppercase', letterSpacing: 0.5,
            }}>
              Default types
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.5}>
              {DEFAULT_ENTRY_TYPES.map((type) => (
                <Chip
                  key={type.id}
                  label={`${type.emoji} ${type.name}`}
                  size="small"
                  sx={{
                    background: alpha(type.color, 0.12),
                    fontWeight: 700, fontSize: '0.72rem', height: 26,
                    border: `1px solid ${alpha(type.color, 0.25)}`,
                  }}
                />
              ))}
            </Stack>
          </Box>

          <Divider sx={{ borderColor: alpha(brand[200], 0.35) }} />

          {/* Custom types */}
          <Box>
            <Typography sx={{
              fontSize: '0.68rem', fontWeight: 800, color: 'text.disabled',
              mb: 0.75, textTransform: 'uppercase', letterSpacing: 0.5,
            }}>
              Custom types
            </Typography>
            {deleteError && (
              <Alert
                severity="error"
                onClose={() => setDeleteError(null)}
                sx={{ mb: 0.75, borderRadius: 2, fontSize: '0.78rem' }}
              >
                {deleteError}
              </Alert>
            )}
            {customTypes.length === 0 ? (
              <Typography sx={{ fontSize: '0.78rem', color: 'text.disabled', fontStyle: 'italic' }}>
                No custom types yet
              </Typography>
            ) : (
              <Stack direction="row" flexWrap="wrap" gap={0.5}>
                {customTypes.map((type) => (
                  <Chip
                    key={type.id}
                    label={`${type.emoji} ${type.name}`}
                    size="small"
                    onDelete={deleting === type.id ? undefined : () => handleDelete(type.id)}
                    deleteIcon={deleting === type.id
                      ? <CircularProgress size={12} />
                      : undefined}
                    sx={{
                      background: alpha(type.color, 0.12),
                      fontWeight: 700, fontSize: '0.72rem', height: 26,
                      border: `1px solid ${alpha(type.color, 0.25)}`,
                    }}
                  />
                ))}
              </Stack>
            )}
          </Box>

          <Divider sx={{ borderColor: alpha(brand[200], 0.35) }} />

          {/* Add new type */}
          <Box>
            <Typography sx={{
              fontSize: '0.68rem', fontWeight: 800, color: 'text.disabled',
              mb: 0.75, textTransform: 'uppercase', letterSpacing: 0.5,
            }}>
              Add custom type
            </Typography>
            {addError && (
              <Alert
                severity="error"
                onClose={() => setAddError(null)}
                sx={{ mb: 0.75, borderRadius: 2, fontSize: '0.78rem' }}
              >
                {addError}
              </Alert>
            )}
            {addSuccess && (
              <Alert severity="success" sx={{ mb: 0.75, borderRadius: 2, fontSize: '0.78rem' }}>
                Type added! ✨
              </Alert>
            )}
            <Stack direction="row" spacing={0.75} alignItems="flex-end">
              <TextField
                label="Emoji"
                value={newTypeEmoji}
                onChange={(e) => setNewTypeEmoji(e.target.value)}
                size="small"
                inputProps={{ maxLength: 2 }}
                sx={{
                  width: 70,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2.5, fontSize: '1rem',
                    background: alpha('#fff', 0.6),
                  },
                }}
              />
              <TextField
                label="Name"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleAdd(); }}
                size="small"
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2.5, fontSize: '0.8rem',
                    background: alpha('#fff', 0.6),
                  },
                }}
              />
              <Button
                onClick={handleAdd}
                disabled={!newTypeName.trim() || adding}
                size="small"
                sx={{
                  borderRadius: 2.5, px: 1.5, fontWeight: 700,
                  fontSize: '0.75rem', flexShrink: 0, minWidth: 52,
                  background: `linear-gradient(135deg, ${brand[400]}, ${accent[300]})`,
                  color: '#fff',
                  '&:hover': { background: `linear-gradient(135deg, ${brand[500]}, ${accent[400]})` },
                  '&:disabled': { background: alpha(brand[200], 0.3), color: alpha(brand[400], 0.4) },
                }}
              >
                {adding ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : 'Add'}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            background: `linear-gradient(135deg, ${brand[400]}, ${accent[300]})`,
            color: 'white', fontWeight: 700, textTransform: 'none',
            borderRadius: 2.5, px: 3,
            '&:hover': { background: `linear-gradient(135deg, ${brand[500]}, ${accent[400]})` },
          }}
        >
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}

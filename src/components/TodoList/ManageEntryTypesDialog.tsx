'use client';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseIcon from '@mui/icons-material/Close';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';

import EmojiPicker, { type EmojiClickData, Theme } from '@/components/LazyEmojiPicker';
import { StyledDialog } from '@/components/StyledDialog';
import type { EntryType } from '@/types/todo';

import { DEFAULT_ENTRY_TYPES, getEntryTypeName } from './helpers';

interface ManageEntryTypesDialogProps {
  open: boolean;
  onClose: () => void;
  allEntryTypes: EntryType[];
  onAddEntryType: (name: string, emoji: string, color: string) => Promise<EntryType>;
  onUpdateEntryType: (id: string, name: string, emoji: string) => Promise<EntryType>;
  onDeleteEntryType: (typeId: string) => Promise<void>;
}

const defaultTypeIds = new Set(DEFAULT_ENTRY_TYPES.map((t) => t.id));

function EmojiButton({
  emoji,
  onClick,
}: {
  emoji: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  return (
    <Box
      component="button"
      onClick={onClick}
      sx={{
        width: 52,
        height: 52,
        borderRadius: 3,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.8rem',
        lineHeight: 1,
        cursor: 'pointer',
        background: `linear-gradient(135deg, ${alpha(brand[100], 0.8)}, ${alpha(accent[100], 0.6)})`,
        border: `2px dashed ${alpha(brand[400], 0.4)}`,
        boxShadow: `0 2px 8px ${alpha(brand[200], 0.3)}`,
        transition: 'all 0.15s ease',
        '&:hover': {
          border: `2px solid ${brand[400]}`,
          transform: 'scale(1.08)',
          boxShadow: `0 4px 12px ${alpha(brand[300], 0.4)}`,
        },
      }}
    >
      {emoji}
    </Box>
  );
}

export function ManageEntryTypesDialog({
  open,
  onClose,
  allEntryTypes,
  onAddEntryType,
  onUpdateEntryType,
  onDeleteEntryType,
}: ManageEntryTypesDialogProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const t = useTranslations('Todo.manageEntryTypesDialog');
  const tCommon = useTranslations('Common');
  const tEntryTypeNames = useTranslations('Todo.defaultEntryTypeNames');

  const TYPE_COLORS = useMemo(
    () => [
      brand[400],
      brand[600],
      accent[400],
      accent[600],
      theme.palette.error.main,
      theme.palette.warning.main,
      theme.palette.success.main,
      theme.palette.info.main,
    ],
    [
      brand,
      accent,
      theme.palette.error.main,
      theme.palette.warning.main,
      theme.palette.success.main,
      theme.palette.info.main,
    ],
  );

  const pickerSx = {
    '--epr-bg-color': brand[50],
    '--epr-category-label-bg-color': brand[100],
    '--epr-hover-bg-color': alpha(brand[300], 0.25),
    '--epr-focus-bg-color': alpha(brand[300], 0.35),
    '--epr-highlight-color': brand[400],
    '--epr-search-border-color': alpha(brand[400], 0.4),
    '--epr-header-overlay-color': brand[50],
    '--epr-category-icon-active-color': accent[500],
    '--epr-search-input-bg-color': '#fff',
    '--epr-emoji-size': '24px',
    borderRadius: 3,
    overflow: 'hidden',
  };

  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeEmoji, setNewTypeEmoji] = useState('🎉');
  const [newPickerAnchor, setNewPickerAnchor] = useState<HTMLButtonElement | null>(null);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('');
  const [editPickerAnchor, setEditPickerAnchor] = useState<HTMLButtonElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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
      setAddError(t('errorAdd'));
    } finally {
      setAdding(false);
    }
  }, [newTypeName, newTypeEmoji, onAddEntryType, TYPE_COLORS, t]);

  const startEdit = useCallback((type: EntryType) => {
    setEditingId(type.id);
    setEditName(type.name);
    setEditEmoji(type.emoji);
    setEditError(null);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditPickerAnchor(null);
    setEditError(null);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingId) return;
    const name = editName.trim();
    if (!name) return;
    setSaving(true);
    setEditError(null);
    try {
      await onUpdateEntryType(editingId, name, editEmoji || '🎉');
      setEditingId(null);
    } catch {
      setEditError(t('errorSave'));
    } finally {
      setSaving(false);
    }
  }, [editingId, editName, editEmoji, onUpdateEntryType, t]);

  const handleDelete = useCallback(
    async (id: string) => {
      setDeleting(id);
      setDeleteError(null);
      try {
        await onDeleteEntryType(id);
      } catch {
        setDeleteError(t('errorDelete'));
      } finally {
        setDeleting(null);
      }
    },
    [onDeleteEntryType, t],
  );

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 2.5,
      background: alpha('#fff', 0.65),
      fontSize: '0.85rem',
    },
  };

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      title={t('title')}
      actions={
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            background: `linear-gradient(135deg, ${brand[400]}, ${accent[300]})`,
            color: 'white',
            fontWeight: 700,
            textTransform: 'none',
            borderRadius: 2.5,
            px: 3,
            '&:hover': { background: `linear-gradient(135deg, ${brand[500]}, ${accent[400]})` },
          }}
        >
          {tCommon('done')}
        </Button>
      }
    >
      <Stack spacing={2}>
        <Box>
          <Typography
            sx={{
              fontSize: '0.68rem',
              fontWeight: 800,
              color: 'text.disabled',
              mb: 0.75,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {t('builtInLabels')}
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={0.5}>
            {DEFAULT_ENTRY_TYPES.map((type) => (
              <Chip
                key={type.id}
                label={`${type.emoji} ${getEntryTypeName(type, tEntryTypeNames)}`}
                size="small"
                sx={{
                  background: alpha(type.color, 0.12),
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  height: 26,
                  border: `1px solid ${alpha(type.color, 0.25)}`,
                }}
              />
            ))}
          </Stack>
        </Box>

        <Divider sx={{ borderColor: alpha(brand[200], 0.35) }} />

        <Box>
          <Typography
            sx={{
              fontSize: '0.68rem',
              fontWeight: 800,
              color: 'text.disabled',
              mb: 0.75,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {t('myLabels')}
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
          {editError && (
            <Alert
              severity="error"
              onClose={() => setEditError(null)}
              sx={{ mb: 0.75, borderRadius: 2, fontSize: '0.78rem' }}
            >
              {editError}
            </Alert>
          )}
          {customTypes.length === 0 ? (
            <Typography sx={{ fontSize: '0.78rem', color: 'text.disabled', fontStyle: 'italic' }}>
              {t('noCustomLabels')}
            </Typography>
          ) : (
            <Stack spacing={0.75}>
              {customTypes.map((type) => {
                const isEditing = editingId === type.id;
                return (
                  <Box
                    key={type.id}
                    sx={{
                      borderRadius: 2.5,
                      border: `1.5px solid ${isEditing ? alpha(brand[400], 0.45) : alpha(brand[200], 0.4)}`,
                      background: isEditing ? alpha(brand[50], 0.8) : alpha('#fff', 0.55),
                      p: isEditing ? 1.25 : 0.75,
                      transition: 'all 0.18s ease',
                    }}
                  >
                    {isEditing ? (
                      <Stack spacing={1.25}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Tooltip title={t('pickEmoji')}>
                            <span>
                              <EmojiButton
                                emoji={editEmoji || '🎉'}
                                onClick={(e) => setEditPickerAnchor(e.currentTarget)}
                              />
                            </span>
                          </Tooltip>
                          <TextField
                            label={t('nameLabel')}
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') void handleSaveEdit();
                              if (e.key === 'Escape') cancelEdit();
                            }}
                            size="small"
                            fullWidth
                            autoFocus
                            sx={inputSx}
                          />
                        </Stack>
                        <Popover
                          open={Boolean(editPickerAnchor)}
                          anchorEl={editPickerAnchor}
                          onClose={() => setEditPickerAnchor(null)}
                          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                        >
                          <Box sx={pickerSx}>
                            <EmojiPicker
                              theme={Theme.LIGHT}
                              onEmojiClick={(data: EmojiClickData) => {
                                setEditEmoji(data.emoji);
                                setEditPickerAnchor(null);
                              }}
                              lazyLoadEmojis
                            />
                          </Box>
                        </Popover>
                        <Stack direction="row" spacing={0.75} justifyContent="flex-end">
                          <Button
                            size="small"
                            onClick={cancelEdit}
                            startIcon={<CloseIcon sx={{ fontSize: '0.9rem !important' }} />}
                            sx={{
                              borderRadius: 2,
                              fontSize: '0.75rem',
                              color: 'text.secondary',
                              textTransform: 'none',
                            }}
                          >
                            {tCommon('cancel')}
                          </Button>
                          <Button
                            size="small"
                            onClick={handleSaveEdit}
                            disabled={!editName.trim() || saving}
                            startIcon={
                              saving ? (
                                <CircularProgress size={12} />
                              ) : (
                                <CheckRoundedIcon sx={{ fontSize: '0.9rem !important' }} />
                              )
                            }
                            sx={{
                              borderRadius: 2,
                              fontSize: '0.75rem',
                              textTransform: 'none',
                              fontWeight: 700,
                              background: `linear-gradient(135deg, ${brand[400]}, ${accent[300]})`,
                              color: '#fff',
                              '&:hover': {
                                background: `linear-gradient(135deg, ${brand[500]}, ${accent[400]})`,
                              },
                              '&:disabled': {
                                background: alpha(brand[200], 0.3),
                                color: alpha(brand[400], 0.4),
                              },
                            }}
                          >
                            {tCommon('save')}
                          </Button>
                        </Stack>
                      </Stack>
                    ) : (
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: 2,
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.1rem',
                            background: alpha(type.color, 0.12),
                            border: `1.5px solid ${alpha(type.color, 0.28)}`,
                          }}
                        >
                          {type.emoji}
                        </Box>
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            color: 'text.primary',
                            flex: 1,
                          }}
                        >
                          {type.name}
                        </Typography>
                        <Tooltip title={tCommon('edit')}>
                          <IconButton
                            size="small"
                            onClick={() => startEdit(type)}
                            sx={{
                              color: brand[400],
                              p: 0.4,
                              '&:hover': { color: brand[600], background: alpha(brand[100], 0.6) },
                            }}
                          >
                            <EditRoundedIcon sx={{ fontSize: '0.95rem' }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={tCommon('delete')}>
                          <IconButton
                            size="small"
                            onClick={() => void handleDelete(type.id)}
                            disabled={deleting === type.id}
                            sx={{
                              color: theme.palette.error.main,
                              p: 0.4,
                              '&:hover': { background: alpha(theme.palette.error.main, 0.1) },
                            }}
                          >
                            {deleting === type.id ? (
                              <CircularProgress size={13} color="inherit" />
                            ) : (
                              <DeleteRoundedIcon sx={{ fontSize: '0.95rem' }} />
                            )}
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    )}
                  </Box>
                );
              })}
            </Stack>
          )}
        </Box>

        <Divider sx={{ borderColor: alpha(brand[200], 0.35) }} />

        <Box>
          <Typography
            sx={{
              fontSize: '0.68rem',
              fontWeight: 800,
              color: 'text.disabled',
              mb: 0.75,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {t('makeNewLabel')}
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
              {t('labelAdded')}
            </Alert>
          )}
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title={t('pickEmoji')}>
              <span>
                <EmojiButton
                  emoji={newTypeEmoji || '🎉'}
                  onClick={(e) => setNewPickerAnchor(e.currentTarget)}
                />
              </span>
            </Tooltip>
            <TextField
              label={t('labelNameLabel')}
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleAdd();
              }}
              size="small"
              fullWidth
              sx={inputSx}
            />
            <Button
              onClick={handleAdd}
              disabled={!newTypeName.trim() || adding}
              variant="contained"
              sx={{
                borderRadius: 2.5,
                fontWeight: 700,
                fontSize: '0.8rem',
                flexShrink: 0,
                whiteSpace: 'nowrap',
                px: 2,
                background: `linear-gradient(135deg, ${brand[400]}, ${accent[300]})`,
                color: '#fff',
                '&:hover': { background: `linear-gradient(135deg, ${brand[500]}, ${accent[400]})` },
                '&:disabled': { background: alpha(brand[200], 0.3), color: alpha(brand[400], 0.4) },
              }}
            >
              {adding ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : t('addButton')}
            </Button>
          </Stack>
          <Popover
            open={Boolean(newPickerAnchor)}
            anchorEl={newPickerAnchor}
            onClose={() => setNewPickerAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          >
            <Box sx={pickerSx}>
              <EmojiPicker
                theme={Theme.LIGHT}
                onEmojiClick={(data: EmojiClickData) => {
                  setNewTypeEmoji(data.emoji);
                  setNewPickerAnchor(null);
                }}
                lazyLoadEmojis
              />
            </Box>
          </Popover>
        </Box>
      </Stack>
    </StyledDialog>
  );
}

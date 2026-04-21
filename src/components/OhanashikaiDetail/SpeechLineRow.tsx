'use client';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import { alpha } from '@mui/material/styles';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import FuriganaText, { stripFurigana } from '@/components/FuriganaText';
import { SpeakButton } from '@/components/SpeakButton';

interface SpeechLineRowProps {
  lineId: string;
  text: string;
  index: number;
  editingId: string | null;
  editVal: string;
  brandPalette: Record<number, string>;
  onStartEdit: (id: string, text: string) => void;
  onEditValChange: (val: string) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
}

export function SpeechLineRow({
  lineId, text, index, editingId, editVal, brandPalette,
  onStartEdit, onEditValChange, onCommitEdit, onCancelEdit, onDelete,
}: SpeechLineRowProps) {
  const isEditing = editingId === lineId;

  return (
    <Box
      sx={{
        display: 'flex', alignItems: 'flex-start', gap: 1.5,
        p: { xs: 1.5, sm: 2 }, borderRadius: 2.5, bgcolor: '#FFFFFF',
        border: `1px solid ${alpha(brandPalette[200], 0.6)}`,
        boxShadow: `0 1px 6px ${alpha(brandPalette[200], 0.1)}`,
      }}
    >
      <Box
        sx={{
          minWidth: 28, height: 28, borderRadius: '50%',
          bgcolor: alpha(brandPalette[100], 0.8),
          border: `1px solid ${alpha(brandPalette[300], 0.4)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, mt: 0.25,
        }}
      >
        <Typography sx={{ fontSize: '0.65rem', fontWeight: 900, color: brandPalette[600] }}>
          {index + 1}
        </Typography>
      </Box>

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        {isEditing ? (
          <TextField
            value={editVal}
            onChange={(e) => onEditValChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) void onCommitEdit();
              if (e.key === 'Escape') onCancelEdit();
            }}
            size="small" fullWidth multiline autoFocus
            sx={{ '& .MuiOutlinedInput-root': { fontFamily: (t) => t.fonts.jp, fontSize: '0.95rem' } }}
          />
        ) : (
          <FuriganaText
            text={text}
            showFurigana
            sx={{
              fontFamily: (t) => t.fonts.jp,
              fontSize: { xs: '1.1rem', sm: '1.25rem' },
              lineHeight: 2.8, color: 'text.primary', wordBreak: 'break-all',
            }}
          />
        )}
      </Box>

      <Stack direction="row" spacing={0.25} flexShrink={0}>
        {isEditing ? (
          <>
            <Tooltip title="Save (Enter)">
              <IconButton size="small" onClick={onCommitEdit} sx={{ width: 26, height: 26, borderRadius: '8px', bgcolor: brandPalette[50], border: `1px solid ${alpha(brandPalette[300], 0.4)}`, color: brandPalette[700] }}>
                <CheckIcon sx={{ fontSize: 13 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Cancel (Esc)">
              <IconButton size="small" onClick={onCancelEdit} sx={{ width: 26, height: 26, borderRadius: '8px', color: 'text.secondary', border: '1px solid rgba(0,0,0,0.1)' }}>
                <CloseIcon sx={{ fontSize: 13 }} />
              </IconButton>
            </Tooltip>
          </>
        ) : (
          <>
            <Tooltip title="Listen">
              <span>
                <SpeakButton text={stripFurigana(text)} iconSize="13px" sx={{ width: 26, height: 26, borderRadius: '8px' }} />
              </span>
            </Tooltip>
            <Tooltip title="Edit line">
              <IconButton size="small" onClick={() => onStartEdit(lineId, text)} sx={{ width: 26, height: 26, borderRadius: '8px', color: alpha(brandPalette[600], 0.5), '&:hover': { bgcolor: brandPalette[50], color: brandPalette[600] } }}>
                <EditIcon sx={{ fontSize: 13 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete line">
              <IconButton size="small" onClick={() => onDelete(lineId)} sx={{ width: 26, height: 26, borderRadius: '8px', color: 'rgba(251,113,133,0.5)', '&:hover': { bgcolor: 'rgba(251,113,133,0.1)', color: 'error.main' } }}>
                <DeleteIcon sx={{ fontSize: 13 }} />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Stack>
    </Box>
  );
}

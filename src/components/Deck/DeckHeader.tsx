'use client';
import { useCallback, useState, useRef } from 'react';
import {
  Box, Typography, Chip, IconButton, TextField,
  CircularProgress, Tooltip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import CodeIcon from '@mui/icons-material/Code';
import type { Deck } from '@/types/deck';

interface DeckHeaderProps {
  deck: Deck;
  cardCount: number;
  onBack: () => void;
  onRename: (id: string, name: string, desc?: string) => Promise<void>;
  onPin: (id: string, pinned: boolean) => void;
  onEmbedOpen: () => void;
}

export function DeckHeader({ deck, cardCount, onBack, onRename, onPin, onEmbedOpen }: DeckHeaderProps) {
  const { brand, accent } = useTheme().palette;

  const [editing, setEditing] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameVal, setNameVal] = useState('');
  const [descVal, setDescVal] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  const startEdit = useCallback(() => {
    setNameVal(deck.name);
    setDescVal(deck.description ?? '');
    setEditing(true);
    setTimeout(() => nameInputRef.current?.focus(), 0);
  }, [deck]);

  const cancelEdit = useCallback(() => setEditing(false), []);

  const commitEdit = useCallback(async () => {
    const trimmedName = nameVal.trim();
    const trimmedDesc = descVal.trim();
    if (!trimmedName) { setEditing(false); return; }

    const nameChanged = trimmedName !== deck.name;
    const descChanged = trimmedDesc !== (deck.description ?? '');
    if (!nameChanged && !descChanged) { setEditing(false); return; }

    setRenaming(true);
    try { await onRename(deck.id, trimmedName, trimmedDesc || undefined); }
    finally { setRenaming(false); setEditing(false); }
  }, [nameVal, descVal, deck, onRename]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') void commitEdit();
    if (e.key === 'Escape') cancelEdit();
  }, [commitEdit, cancelEdit]);

  return (
    <Box
      sx={{
        position: 'relative',
        mb: 3,
        borderRadius: '16px',
        overflow: 'hidden',
        bgcolor: '#FFFFFF',
        border: `1.5px solid ${alpha(brand[300], 0.35)}`,
        boxShadow: `0 2px 12px ${alpha(brand[300], 0.12)}`,
      }}
    >
      <Box
        sx={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
          background: `linear-gradient(180deg, ${brand[200]} 0%, ${brand[400]} 50%, ${accent[300]} 100%)`,
          borderRadius: '16px 0 0 16px',
        }}
      />

      <Box
        sx={{
          display: 'flex', alignItems: 'center', gap: 2,
          px: { xs: 2.5, sm: 3 }, pl: { xs: 3.5, sm: 4 }, py: { xs: 2, sm: 2.5 },
        }}
      >
        <IconButton
          onClick={onBack}
          size="small"
          sx={{
            border: `1.5px solid ${alpha(brand[300], 0.45)}`,
            borderRadius: '9px', width: 32, height: 32, flexShrink: 0,
            color: brand[700],
            '&:hover': { bgcolor: brand[50], borderColor: brand[400] },
          }}
        >
          <ArrowBackIcon sx={{ fontSize: 15 }} />
        </IconButton>

        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          {editing ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  inputRef={nameInputRef}
                  value={nameVal}
                  onChange={(e) => setNameVal(e.target.value)}
                  onKeyDown={handleKeyDown}
                  size="small"
                  autoComplete="off"
                  disabled={renaming}
                  placeholder="Deck name"
                  sx={{
                    flexGrow: 1,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '9px', fontSize: '1.25rem', fontWeight: 700,
                      color: brand[800], fontFamily: '"Nunito", sans-serif',
                      '& fieldset': { borderColor: alpha(brand[400], 0.5) },
                      '&:hover fieldset': { borderColor: brand[400] },
                      '&.Mui-focused fieldset': { borderColor: brand[500] },
                    },
                  }}
                />
                {renaming ? (
                  <CircularProgress size={18} sx={{ color: 'primary.main', flexShrink: 0 }} />
                ) : (
                  <>
                    <Tooltip title="Save (Enter)">
                      <IconButton
                        size="small" onClick={commitEdit}
                        sx={{
                          width: 30, height: 30, borderRadius: '8px',
                          bgcolor: brand[50], border: `1.5px solid ${alpha(brand[400], 0.4)}`,
                          color: brand[700],
                          '&:hover': { bgcolor: brand[100], borderColor: brand[400] },
                        }}
                      >
                        <CheckIcon sx={{ fontSize: 15 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Cancel (Esc)">
                      <IconButton
                        size="small" onClick={cancelEdit}
                        sx={{
                          width: 30, height: 30, borderRadius: '8px',
                          color: 'text.secondary', border: '1.5px solid rgba(0,0,0,0.1)',
                          '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' },
                        }}
                      >
                        <CloseIcon sx={{ fontSize: 15 }} />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
              </Box>
              <TextField
                value={descVal}
                onChange={(e) => setDescVal(e.target.value)}
                onKeyDown={handleKeyDown}
                size="small"
                autoComplete="off"
                disabled={renaming}
                placeholder="Description (optional)"
                sx={{
                  pr: '76px',
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '9px', fontSize: '0.82rem',
                    color: brand[500], fontFamily: '"Nunito", sans-serif',
                    '& fieldset': { borderColor: alpha(brand[400], 0.35) },
                    '&:hover fieldset': { borderColor: brand[400] },
                    '&.Mui-focused fieldset': { borderColor: brand[500] },
                  },
                }}
              />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
              <Typography variant="h4" sx={{ color: brand[800], lineHeight: 1.1, minWidth: 0 }}>
                {deck.name}
              </Typography>
              <Tooltip title="Rename deck">
                <IconButton
                  size="small" onClick={startEdit}
                  sx={{
                    width: 26, height: 26, borderRadius: '7px', flexShrink: 0,
                    color: alpha(brand[700], 0.45),
                    '&:hover': { bgcolor: brand[50], color: brand[700] },
                  }}
                >
                  <EditIcon sx={{ fontSize: 13 }} />
                </IconButton>
              </Tooltip>
            </Box>
          )}

          {!editing && deck.description && (
            <Typography variant="body2" sx={{ color: brand[500], mt: 0.25 }}>
              {deck.description}
            </Typography>
          )}
        </Box>

        {!editing && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
            <Tooltip title={deck.isPublic ? 'Embed (public)' : 'Embed deck'}>
              <IconButton
                size="small" onClick={onEmbedOpen}
                sx={{
                  width: 30, height: 30, borderRadius: '8px',
                  border: `1.5px solid ${deck.isPublic ? alpha(accent[500], 0.6) : alpha(brand[300], 0.45)}`,
                  bgcolor: deck.isPublic ? alpha(accent[100], 0.8) : 'transparent',
                  color: deck.isPublic ? accent[600] : alpha(brand[500], 0.55),
                  '&:hover': {
                    bgcolor: alpha(accent[100], 0.8),
                    color: accent[600],
                    borderColor: alpha(accent[500], 0.6),
                  },
                }}
              >
                <CodeIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title={deck.pinned ? 'Unpin from home' : 'Pin to home'}>
              <IconButton
                size="small"
                onClick={() => onPin(deck.id, !deck.pinned)}
                sx={{
                  width: 30, height: 30, borderRadius: '8px',
                  border: `1.5px solid ${deck.pinned ? alpha(brand[500], 0.6) : alpha(brand[300], 0.45)}`,
                  bgcolor: deck.pinned ? alpha(brand[100], 0.8) : 'transparent',
                  color: deck.pinned ? brand[600] : alpha(brand[500], 0.55),
                  '&:hover': {
                    bgcolor: alpha(brand[100], 0.8),
                    color: brand[600],
                    borderColor: alpha(brand[500], 0.6),
                  },
                }}
              >
                {deck.pinned
                  ? <PushPinIcon sx={{ fontSize: 14 }} />
                  : <PushPinOutlinedIcon sx={{ fontSize: 14 }} />
                }
              </IconButton>
            </Tooltip>
            <Chip
              label={`${cardCount} card${cardCount !== 1 ? 's' : ''}`}
              size="small"
              sx={{
                borderRadius: '8px', bgcolor: brand[50],
                border: `1.5px solid ${alpha(brand[400], 0.4)}`,
                color: brand[700], fontWeight: 800, fontSize: '0.7rem',
              }}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}

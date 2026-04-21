'use client';
import { useCallback, useState, useRef } from 'react';
import {
  Box, Typography, Chip, IconButton, TextField,
  CircularProgress, Tooltip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import CodeIcon from '@mui/icons-material/Code';
import { PageHeader } from '@/components/PageHeader';
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
  const { brand } = useTheme().palette;

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

  if (editing) {
    return (
      <PageHeader
        onBack={onBack}
        title=""
        compact
        mb={3}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 0.5 }}>
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
                  color: brand[800],
                  bgcolor: alpha('#FFFFFF', 0.6),
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
                      bgcolor: alpha('#FFFFFF', 0.6), border: `1.5px solid ${alpha(brand[400], 0.4)}`,
                      color: brand[700],
                      '&:hover': { bgcolor: alpha('#FFFFFF', 0.8), borderColor: brand[400] },
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
                      color: 'text.secondary', border: `1.5px solid ${alpha(brand[300], 0.3)}`,
                      bgcolor: alpha('#FFFFFF', 0.4),
                      '&:hover': { bgcolor: alpha('#FFFFFF', 0.7) },
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
              '& .MuiOutlinedInput-root': {
                borderRadius: '9px', fontSize: '0.82rem',
                color: brand[600],
                bgcolor: alpha('#FFFFFF', 0.5),
                '& fieldset': { borderColor: alpha(brand[400], 0.35) },
                '&:hover fieldset': { borderColor: brand[400] },
                '&.Mui-focused fieldset': { borderColor: brand[500] },
              },
            }}
          />
        </Box>
      </PageHeader>
    );
  }

  return (
    <PageHeader
      onBack={onBack}
      title={
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
                '&:hover': { bgcolor: alpha('#FFFFFF', 0.5), color: brand[700] },
              }}
            >
              <EditIcon sx={{ fontSize: 13 }} />
            </IconButton>
          </Tooltip>
        </Box>
      }
      subtitle={deck.description ?? undefined}
      badge={`${cardCount} card${cardCount !== 1 ? 's' : ''}`}
      compact
      mb={3}
      action={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title={deck.isPublic ? 'Embed (public)' : 'Embed deck'}>
            <IconButton
              size="small" onClick={onEmbedOpen}
              sx={{
                width: 30, height: 30, borderRadius: '8px',
                border: `1.5px solid ${deck.isPublic ? alpha(brand[500], 0.6) : alpha(brand[300], 0.45)}`,
                bgcolor: deck.isPublic ? alpha(brand[100], 0.8) : alpha('#FFFFFF', 0.4),
                color: deck.isPublic ? brand[600] : alpha(brand[500], 0.55),
                '&:hover': {
                  bgcolor: alpha(brand[100], 0.8),
                  color: brand[600],
                  borderColor: alpha(brand[500], 0.6),
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
                bgcolor: deck.pinned ? alpha(brand[100], 0.8) : alpha('#FFFFFF', 0.4),
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
        </Box>
      }
    />
  );
}

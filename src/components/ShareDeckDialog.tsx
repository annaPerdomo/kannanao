'use client';
import IosShareIcon from '@mui/icons-material/IosShare';
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useEffect, useState } from 'react';

import { StyledDialog } from '@/components/StyledDialog';
import type { DeckShare } from '@/lib/supabase';
import { dbGetDeckShares, dbShareDeck, dbUnShareDeck } from '@/lib/supabase';

interface Props {
  open: boolean;
  onClose: () => void;
  deckId: string;
  deckName: string;
}

export function ShareDeckDialog({ open, onClose, deckId, deckName }: Props) {
  const { palette } = useTheme();
  const { accent } = palette;

  const [username, setUsername] = useState('');
  const [shares, setShares] = useState<DeckShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setUsername('');
    setError(null);
    setLoading(true);
    dbGetDeckShares(deckId).then((s) => {
      setShares(s);
      setLoading(false);
    });
  }, [open, deckId]);

  const handleShare = async () => {
    if (!username.trim()) return;
    setSharing(true);
    setError(null);
    const { error } = await dbShareDeck(deckId, username);
    if (error) {
      setError(error);
      setSharing(false);
      return;
    }
    const updated = await dbGetDeckShares(deckId);
    setShares(updated);
    setUsername('');
    setSharing(false);
  };

  const handleRemove = async (shareId: string) => {
    setShares((prev) => prev.filter((s) => s.id !== shareId));
    await dbUnShareDeck(shareId);
  };

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      title="Share Deck"
      subtitle={deckName}
      icon={<IosShareIcon sx={{ color: accent[600], fontSize: 20 }} />}
      actions={
        <Button
          onClick={onClose}
          sx={{ color: 'text.secondary', textTransform: 'none', fontWeight: 700 }}
        >
          Done
        </Button>
      }
    >
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <TextField
          placeholder="Username"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleShare();
          }}
          size="small"
          fullWidth
          disabled={sharing}
        />
        <Button
          onClick={handleShare}
          disabled={sharing || !username.trim()}
          variant="contained"
          sx={{
            bgcolor: accent[600],
            color: '#fff',
            textTransform: 'none',
            borderRadius: 6,
            whiteSpace: 'nowrap',
            flexShrink: 0,
            '&:hover': { bgcolor: accent[700] },
            '&:disabled': { bgcolor: alpha(accent[600], 0.25) },
          }}
          startIcon={
            sharing ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <PersonAddAltIcon fontSize="small" />
            )
          }
        >
          Share
        </Button>
      </Box>

      {error && (
        <Typography variant="caption" sx={{ color: 'error.main', mt: 0.75, display: 'block' }}>
          {error}
        </Typography>
      )}

      <Divider sx={{ my: 2 }} />

      <Typography variant="caption" sx={{ color: 'text.secondary', mb: 1, display: 'block' }}>
        Shared with
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={22} sx={{ color: accent[600] }} />
        </Box>
      ) : shares.length === 0 ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: 'center', py: 2, fontSize: '0.82rem' }}
        >
          Not shared with anyone yet
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {shares.map((share) => (
            <Box
              key={share.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 1.5,
                py: 0.75,
                borderRadius: 3,
                bgcolor: alpha(accent[100], 0.5),
                border: `1.5px solid ${alpha(accent[300], 0.3)}`,
              }}
            >
              <Typography
                sx={{
                  fontFamily: (t) => t.fonts.display,
                  fontSize: '0.95rem',
                  color: 'text.primary',
                }}
              >
                {share.username}
              </Typography>
              <IconButton
                size="small"
                onClick={() => handleRemove(share.id)}
                aria-label="Remove share"
                sx={{
                  color: alpha('#dc2626', 0.5),
                  '&:hover': { color: '#dc2626', bgcolor: 'rgba(220,38,38,0.08)' },
                }}
              >
                <PersonRemoveIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}
    </StyledDialog>
  );
}

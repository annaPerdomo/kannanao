'use client';

import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import { useTheme, alpha, keyframes } from '@mui/material/styles';
import { BUDDY_CONFIG } from '@/hooks/useShop';
import type { ShopItem } from '@/types/shop';

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
`;

const bounce = keyframes`
  0%, 100% { transform: translateY(0) scale(1); }
  40% { transform: translateY(-16px) scale(1.1); }
  60% { transform: translateY(-8px) scale(1.05); }
`;

const bubbleIn = keyframes`
  0% { transform: scale(0); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
`;

type DemoPhase = 'idle' | 'correct' | 'wrong';
const DEMO_SEQUENCE: DemoPhase[] = ['idle', 'correct', 'wrong', 'idle'];

export function BuddyPreviewModal({
  open,
  onClose,
  item,
}: {
  open: boolean;
  onClose: () => void;
  item: ShopItem | null;
}) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!open) { setPhase(0); return; }
    const t = setInterval(() => setPhase((p) => (p + 1) % DEMO_SEQUENCE.length), 2000);
    return () => clearInterval(t);
  }, [open]);

  if (!item) return null;

  const config = BUDDY_CONFIG[item.key];
  if (!config) return null;

  const currentPhase = DEMO_SEQUENCE[phase];
  const rawReaction = config.reactions[currentPhase];
  const reactionText = Array.isArray(rawReaction) ? rawReaction[phase % rawReaction.length] : rawReaction;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 4,
            overflow: 'hidden',
            border: `2px solid ${alpha(brand[300], 0.35)}`,
            boxShadow: `0 12px 48px ${alpha(brand[700], 0.18)}`,
          },
        },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          height: 300,
          background: `linear-gradient(145deg, ${alpha(brand[100], 0.95)}, ${alpha(brand[200], 0.6)})`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1.5,
        }}
      >
        <Box
          key={phase}
          sx={{
            bgcolor: alpha('#fff', 0.9),
            border: `1.5px solid ${alpha(brand[300], 0.4)}`,
            borderRadius: 3,
            px: 2.5,
            py: 1,
            maxWidth: 200,
            boxShadow: `0 4px 16px ${alpha(brand[400], 0.15)}`,
            animation: `${bubbleIn} 0.3s ease-out`,
          }}
        >
          <Typography
            sx={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'text.primary',
              textAlign: 'center',
            }}
          >
            {reactionText}
          </Typography>
        </Box>

        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: alpha('#fff', 0.85),
            border: `2.5px solid ${alpha(brand[300], 0.45)}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.8rem',
            lineHeight: 1,
            boxShadow: `0 6px 24px ${alpha(brand[400], 0.2)}`,
            animation: currentPhase === 'correct'
              ? `${bounce} 0.6s ease-in-out infinite`
              : `${float} 3s ease-in-out infinite`,
          }}
        >
          {config.emoji}
        </Box>

        <Typography
          sx={{
            fontFamily: (t) => t.fonts.cute,
            fontSize: '1.2rem',
            fontWeight: 700,
            color: brand[700],
          }}
        >
          {item.name}
        </Typography>
        <Typography
          sx={{
            fontSize: '0.78rem',
            color: 'text.secondary',
            textAlign: 'center',
            px: 3,
          }}
        >
          {item.description}
        </Typography>

        <Box
          sx={{
            display: 'flex',
            gap: 1,
            mt: 0.5,
          }}
        >
          {(['correct', 'wrong', 'idle'] as const).map((r) => (
            <Box
              key={r}
              sx={{
                px: 1.5,
                py: 0.5,
                borderRadius: 2,
                bgcolor: currentPhase === r ? alpha(brand[300], 0.25) : alpha(brand[100], 0.5),
                border: `1px solid ${alpha(brand[300], currentPhase === r ? 0.5 : 0.15)}`,
                transition: 'all 0.2s',
              }}
            >
              <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, color: brand[600], textTransform: 'capitalize' }}>
                {r}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <DialogActions sx={{ justifyContent: 'center', py: 2 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{ borderRadius: 2, px: 4, fontFamily: (t) => t.fonts.cute }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

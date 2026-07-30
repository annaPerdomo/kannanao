'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import { alpha, keyframes, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { BUDDY_ART, buddyShopSrc, FALLBACK_REACTIONS } from '@/lib/buddies';
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

function isNonEmptyStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === 'string');
}

export function BuddyPreviewModal({
  open,
  onClose,
  item,
}: {
  open: boolean;
  onClose: () => void;
  item: ShopItem | null;
}) {
  const t = useTranslations('Shop');
  const tItems = useTranslations('Shop.items');
  const tBuddies = useTranslations('Shop.buddies');
  const theme = useTheme();
  const { brand } = theme.palette;
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!open) {
      setPhase(0);
      return;
    }
    const t = setInterval(() => setPhase((p) => (p + 1) % DEMO_SEQUENCE.length), 2000);
    return () => clearInterval(t);
  }, [open]);

  if (!item || !BUDDY_ART[item.key]) return null;

  const currentPhase = DEMO_SEQUENCE[phase];
  let lines: string[] = FALLBACK_REACTIONS[currentPhase];
  try {
    const raw = tBuddies.raw(`${item.key}.${currentPhase}`);
    if (isNonEmptyStringArray(raw)) lines = raw;
  } catch {
    // missing translation set — keep the generic fallback
  }
  const reactionText = lines[phase % lines.length];
  const { accent, bg } = BUDDY_ART[item.key];

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
          background: `radial-gradient(ellipse at 50% 85%, ${alpha(accent, 0.2)} 0%, ${bg} 70%)`,
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

        <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
          <Box
            component="img"
            src={buddyShopSrc(item.key)}
            alt=""
            draggable={false}
            sx={{
              height: 108,
              maxWidth: 160,
              objectFit: 'contain',
              objectPosition: 'bottom',
              pointerEvents: 'none',
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))',
              animation:
                currentPhase === 'correct'
                  ? `${bounce} 0.6s ease-in-out infinite`
                  : `${float} 3s ease-in-out infinite`,
            }}
          />
        </Box>

        <Typography
          sx={{
            fontFamily: (t) => t.fonts.cute,
            fontSize: '1.2rem',
            fontWeight: 700,
            color: brand[700],
          }}
        >
          {tItems(`${item.key}.name`)}
        </Typography>
        <Typography
          sx={{
            fontSize: '0.78rem',
            color: 'text.secondary',
            textAlign: 'center',
            px: 3,
          }}
        >
          {tItems(`${item.key}.description`)}
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
              <Typography
                sx={{
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  color: brand[600],
                  textTransform: 'capitalize',
                }}
              >
                {t(`buddyPreview.${r}`)}
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
          {t('buddyPreview.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

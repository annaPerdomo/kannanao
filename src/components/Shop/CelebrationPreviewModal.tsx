'use client';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import { useTheme, alpha } from '@mui/material/styles';
import { CELEBRATION_THEMES } from '@/hooks/useShop';
import { CelebParticleStage, CELEB_PARTICLE_BG, CELEBRATION_KEY_TO_THEME } from '@/components/Practice/CelebrationScreen';
import type { ShopItem } from '@/types/shop';

export function CelebrationPreviewModal({
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

  if (!item) return null;

  const particleType = CELEBRATION_KEY_TO_THEME[item.key] ?? 'emojiRain';
  const celebData = CELEBRATION_THEMES[item.key];
  const bg = CELEB_PARTICLE_BG[particleType] ?? CELEB_PARTICLE_BG.emojiRain;
  const isDark = particleType !== 'bubbles' && particleType !== 'bunnies';
  const textColor = isDark ? '#ffffff' : '#2d1b69';
  const subTextColor = isDark ? 'rgba(255,255,255,0.75)' : 'rgba(45,27,105,0.7)';

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
          background: bg,
          overflow: 'hidden',
        }}
      >
        <CelebParticleStage itemKey={item.key} />

        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.75,
            px: 3,
          }}
        >
          <Typography sx={{ fontSize: '4rem', lineHeight: 1 }}>{item.emoji}</Typography>
          <Typography
            sx={{
              fontFamily: (t) => t.fonts.cute,
              fontSize: '1.3rem',
              fontWeight: 700,
              color: textColor,
              textShadow: isDark ? '0 2px 10px rgba(0,0,0,0.5)' : 'none',
            }}
          >
            {item.name}
          </Typography>
          <Typography
            sx={{
              fontSize: '0.78rem',
              color: subTextColor,
              textAlign: 'center',
              textShadow: isDark ? '0 1px 6px rgba(0,0,0,0.4)' : 'none',
            }}
          >
            {item.description}
          </Typography>
          {celebData && (
            <Box sx={{ display: 'flex', gap: 0.75, mt: 0.5 }}>
              {celebData.emojis.slice(0, 5).map((e, i) => (
                <Typography key={i} sx={{ fontSize: '1.4rem' }}>{e}</Typography>
              ))}
            </Box>
          )}
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

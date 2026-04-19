'use client';

import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Skeleton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { ThemeProvider, useTheme, keyframes } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import BorderStyleIcon from '@mui/icons-material/BorderStyle';
import CelebrationIcon from '@mui/icons-material/Celebration';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useProgress } from '@/hooks/useProgess';
import { useShop, SHOP_ITEMS, CARD_BORDER_STYLES, THEME_KEY_TO_SCHEME, CELEBRATION_THEMES } from '@/hooks/useShop';
import { CelebParticleStage, CELEB_PARTICLE_BG, CELEBRATION_KEY_TO_THEME } from '@/components/Practice/CelebrationScreen';
import { useColorScheme } from '@/contexts/ThemeContext';
import { CUTE_FONT, createAppTheme, type ColorScheme } from '@/theme';
import type { ShopItem } from '@/types/shop';
import { CardBorderCtx } from '@/contexts/CardBorderContext';
import { ImageCard } from '@/components/ImageCard';
import { Flashcard } from '@/components/Flashcard';
import type { Flashcard as FlashcardType } from '@/types/flashcard';

// ─── Theme color maps for mini previews ──────────────────────────────────────

const THEME_COLORS: Record<string, { bg: string; brand: string; accent: string; text: string; topBar: string }> = {
  theme_sakura:   { bg: '#FFF5FB', brand: '#F472B6', accent: '#A78BFA', text: '#5E2F6C', topBar: '#F472B6' },
  theme_murasaki: { bg: '#F5F3FF', brand: '#A78BFA', accent: '#F472B6', text: '#2E1065', topBar: '#A78BFA' },
  theme_yuki:     { bg: '#F0F9FF', brand: '#38BDF8', accent: '#A78BFA', text: '#0C4A6E', topBar: '#38BDF8' },
  theme_ocean:    { bg: '#EFF6FF', brand: '#60A5FA', accent: '#2DD4BF', text: '#1E3A8A', topBar: '#60A5FA' },
  theme_forest:   { bg: '#F0FDF4', brand: '#4ADE80', accent: '#34D399', text: '#14532D', topBar: '#4ADE80' },
  theme_sunset:   { bg: '#FFF7ED', brand: '#FB923C', accent: '#FBBF24', text: '#7C2D12', topBar: '#FB923C' },
  theme_lavender: { bg: '#FAF5FF', brand: '#C084FC', accent: '#F472B6', text: '#581C87', topBar: '#C084FC' },
  theme_midnight: { bg: '#F8FAFC', brand: '#94A3B8', accent: '#38BDF8', text: '#0F172A', topBar: '#94A3B8' },
  theme_matcha:   { bg: '#FEFCE8', brand: '#84CC16', accent: '#34D399', text: '#365314', topBar: '#84CC16' },
  theme_rosegold: { bg: '#FFF1F2', brand: '#FB7185', accent: '#FBBF24', text: '#881337', topBar: '#FB7185' },
};

const SAMPLE_CARD: FlashcardType = {
  id: 'preview',
  word: '桜',
  reading: 'さくら',
  meaning: 'Cherry blossom',
  image_query: 'cherry blossom japan',
  imageUrl: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=600&q=80',
  example_jp: '{桜|さくら}の{花|はな}が{綺麗|きれい}に{咲|さ}いています。',
  example_en: 'The cherry blossoms are blooming beautifully.',
  deckId: 'preview',
  mainViewMode: 'kanji',
  cardType: 'word',
  jlptLevel: 'N5',
};

// ─── Animations ──────────────────────────────────────────────────────────────

const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
`;

const sparkle = keyframes`
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
`;

const coinBounce = keyframes`
  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
  50% { transform: translateY(-40px) rotate(180deg); opacity: 0.8; }
  100% { transform: translateY(-60px) rotate(360deg); opacity: 0; }
`;

const celebrate = keyframes`
  0% { transform: scale(0.5); opacity: 0; }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
`;

// ─── Sparkle decoration ─────────────────────────────────────────────────────

function Sparkles({ color, count = 8 }: { color: string; count?: number }) {
  return (
    <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {Array.from({ length: count }).map((_, i) => (
        <Box
          key={i}
          sx={{
            position: 'absolute',
            width: { xs: 4, sm: 6 },
            height: { xs: 4, sm: 6 },
            borderRadius: '50%',
            backgroundColor: color,
            top: `${10 + Math.random() * 80}%`,
            left: `${5 + Math.random() * 90}%`,
            animation: `${sparkle} ${1.5 + Math.random() * 2}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 2}s`,
            opacity: 0.3,
          }}
        />
      ))}
    </Box>
  );
}

// ─── Mini card mockup for theme previews ─────────────────────────────────────

function ThemeCardPreview({ themeKey }: { themeKey: string }) {
  const colors = THEME_COLORS[themeKey];
  if (!colors) return null;

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 1 }}>
      <Box
        sx={{
          width: '80%',
          maxWidth: 120,
          bgcolor: colors.bg,
          borderRadius: '6px',
          overflow: 'hidden',
          border: `1.5px solid ${alpha(colors.brand, 0.3)}`,
          boxShadow: `0 2px 8px ${alpha(colors.brand, 0.2)}`,
        }}
      >
        {/* Mini top bar */}
        <Box sx={{ height: 10, background: `linear-gradient(135deg, ${colors.brand}, ${colors.accent})` }} />
        {/* Mini image area */}
        <Box sx={{
          mx: '4px', mt: '3px', height: 32, borderRadius: '3px',
          background: `linear-gradient(135deg, ${alpha(colors.brand, 0.15)}, ${alpha(colors.accent, 0.15)})`,
          border: `1px solid ${alpha(colors.brand, 0.15)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: alpha(colors.brand, 0.25) }} />
        </Box>
        {/* Mini title line */}
        <Box sx={{ px: '5px', py: '3px' }}>
          <Box sx={{ height: 5, width: '60%', bgcolor: alpha(colors.text, 0.6), borderRadius: 1 }} />
          <Box sx={{ height: 3, width: '80%', bgcolor: alpha(colors.text, 0.2), borderRadius: 1, mt: '2px' }} />
        </Box>
        {/* Mini content block */}
        <Box sx={{ mx: '4px', mb: '4px', p: '3px', bgcolor: alpha(colors.brand, 0.06), borderRadius: '3px', border: `1px solid ${alpha(colors.brand, 0.1)}` }}>
          <Box sx={{ height: 3, width: '50%', bgcolor: alpha(colors.brand, 0.4), borderRadius: 1 }} />
          <Box sx={{ height: 3, width: '70%', bgcolor: alpha(colors.text, 0.15), borderRadius: 1, mt: '2px' }} />
        </Box>
      </Box>
    </Box>
  );
}

// ─── Mini card mockup for border previews ────────────────────────────────────

function BorderCardPreview({ borderKey }: { borderKey: string }) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const borderStyle = CARD_BORDER_STYLES[borderKey] || {};
  const hasBorder = borderKey !== 'border_none' && Object.keys(borderStyle).length > 0;

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 1 }}>
      <Box
        sx={{
          width: '80%',
          maxWidth: 120,
          bgcolor: brand[50],
          borderRadius: '8px',
          overflow: 'visible',
          border: hasBorder ? borderStyle.border : `1.5px solid ${alpha(brand[300], 0.3)}`,
          boxShadow: hasBorder ? borderStyle.boxShadow : `0 2px 8px ${alpha(brand[300], 0.15)}`,
          ...(borderStyle.background ? { background: borderStyle.background } : {}),
        }}
      >
        <Box sx={{
          bgcolor: brand[50],
          borderRadius: hasBorder ? '6px' : '7px',
          overflow: 'hidden',
        }}>
          {/* Mini top bar */}
          <Box sx={{ height: 10, background: `linear-gradient(135deg, ${brand[400]}, ${accent[400]})` }} />
          {/* Mini image area */}
          <Box sx={{
            mx: '4px', mt: '3px', height: 32, borderRadius: '3px',
            background: `linear-gradient(135deg, ${alpha(brand[100], 0.8)}, ${alpha(accent[100], 0.5)})`,
            border: `1px solid ${alpha(brand[300], 0.15)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: alpha(brand[300], 0.3) }} />
          </Box>
          {/* Mini title line */}
          <Box sx={{ px: '5px', py: '3px' }}>
            <Box sx={{ height: 5, width: '55%', bgcolor: alpha('#000', 0.5), borderRadius: 1 }} />
            <Box sx={{ height: 3, width: '75%', bgcolor: alpha('#000', 0.15), borderRadius: 1, mt: '2px' }} />
          </Box>
          {/* Mini content block */}
          <Box sx={{ mx: '4px', mb: '4px', p: '3px', bgcolor: alpha(brand[50], 0.8), borderRadius: '3px', border: `1px solid ${alpha(brand[300], 0.1)}` }}>
            <Box sx={{ height: 3, width: '45%', bgcolor: alpha(brand[400], 0.4), borderRadius: 1 }} />
            <Box sx={{ height: 3, width: '65%', bgcolor: alpha('#000', 0.1), borderRadius: 1, mt: '2px' }} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ─── Category button ─────────────────────────────────────────────────────────

function CategoryButton({
  icon,
  label,
  active,
  onClick,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': { transform: 'translateY(-2px)' },
      }}
    >
      <Box
        sx={{
          width: { xs: 56, sm: 72 },
          height: { xs: 56, sm: 72 },
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: active ? alpha(color, 0.2) : alpha(color, 0.08),
          border: active ? `2.5px solid ${color}` : `1.5px solid ${alpha(color, 0.3)}`,
          boxShadow: active ? `0 4px 16px ${alpha(color, 0.3)}` : 'none',
          transition: 'all 0.2s ease',
          '& .MuiSvgIcon-root': {
            fontSize: { xs: '1.5rem', sm: '2rem' },
            color: active ? color : alpha(color, 0.6),
          },
        }}
      >
        {icon}
      </Box>
      <Typography
        sx={{
          fontFamily: CUTE_FONT,
          fontSize: { xs: '0.65rem', sm: '0.75rem' },
          fontWeight: active ? 700 : 500,
          color: active ? color : 'text.secondary',
          letterSpacing: '0.02em',
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

// ─── Border preview modal ───────────────────────────────────────────────────

function BorderPreviewModal({
  open,
  onClose,
  borderKey,
  borderName,
}: {
  open: boolean;
  onClose: () => void;
  borderKey: string;
  borderName: string;
}) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const [cardView, setCardView] = useState<'collection' | 'study'>('study');

  const borderStyle = CARD_BORDER_STYLES[borderKey] ?? {};
  const previewTheme = useMemo(() => createAppTheme('sakura'), []);

  const mockBorderCtx = useMemo(
    () => ({ borderStyle, equippedBorderKey: borderKey }),
    [borderStyle, borderKey],
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 4,
            border: `2px solid ${alpha(brand[300], 0.35)}`,
            boxShadow: `0 12px 48px ${alpha(brand[700], 0.15)}`,
            bgcolor: theme.palette.surfaces.overlay,
            overflow: 'visible',
            position: 'relative',
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          fontFamily: CUTE_FONT,
          color: brand[700],
          textAlign: 'center',
          pb: 0.5,
          fontSize: '1.15rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
        }}
      >
        <VisibilityIcon sx={{ fontSize: '1.1rem', color: brand[400] }} />
        Preview: {borderName}
      </DialogTitle>

      <Box sx={{ display: 'flex', justifyContent: 'center', pb: 1.5 }}>
        <ToggleButtonGroup
          value={cardView}
          exclusive
          onChange={(_, v) => { if (v) setCardView(v); }}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              fontFamily: CUTE_FONT,
              fontSize: '0.75rem',
              px: 2,
              py: 0.4,
              textTransform: 'none',
              borderColor: alpha(brand[300], 0.4),
              color: brand[600],
              '&.Mui-selected': {
                bgcolor: alpha(brand[400], 0.15),
                color: brand[700],
                borderColor: brand[400],
                fontWeight: 700,
              },
            },
          }}
        >
          <ToggleButton value="study">Study Card</ToggleButton>
          <ToggleButton value="collection">Collection Card</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <DialogContent sx={{ display: 'flex', justifyContent: 'center', pt: 0, pb: 3, px: { xs: 2, sm: 3 } }}>
        <ThemeProvider theme={previewTheme}>
          <CardBorderCtx.Provider value={mockBorderCtx}>
            {cardView === 'study' ? (
              <Box sx={{ width: 280, height: 420 }}>
                <Flashcard card={SAMPLE_CARD} width={280} height={420} />
              </Box>
            ) : (
              <Box sx={{ width: 240 }}>
                <ImageCard
                  card={SAMPLE_CARD}
                  onDelete={() => {}}
                />
              </Box>
            )}
          </CardBorderCtx.Provider>
        </ThemeProvider>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'center', pb: 2.5 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{ borderRadius: 2, px: 4, fontFamily: CUTE_FONT }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Item card ───────────────────────────────────────────────────────────────

function ShopItemCard({
  item,
  owned,
  isEquipped,
  spendableXp,
  onBuy,
  onEquip,
  onPreview,
}: {
  item: ShopItem;
  owned: boolean;
  isEquipped: boolean;
  spendableXp: number;
  onBuy: () => void;
  onEquip: () => void;
  onPreview: () => void;
}) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const canAfford = spendableXp >= item.price;
  const isTheme = item.category === 'theme';
  const isCelebration = item.category === 'celebration';

  if (item.comingSoon) {
    return (
      <Paper
        elevation={0}
        sx={{
          position: 'relative',
          background: alpha(brand[50], 0.4),
          border: `1.5px dashed ${alpha(brand[300], 0.35)}`,
          borderRadius: 3,
          p: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          opacity: 0.75,
        }}
      >
        <Box
          sx={{
            position: 'relative',
            height: { xs: 100, sm: 120 },
            background: `linear-gradient(135deg, ${alpha(brand[100], 0.3)}, ${alpha(brand[200], 0.15)})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography sx={{ fontSize: '2.5rem', filter: 'grayscale(0.3)' }}>
            {item.emoji}
          </Typography>
        </Box>
        <Box sx={{ p: { xs: 1.25, sm: 1.5 }, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography
            sx={{
              fontFamily: CUTE_FONT,
              fontSize: { xs: '0.82rem', sm: '0.92rem' },
              color: alpha(brand[700], 0.6),
              lineHeight: 1.2,
            }}
          >
            {item.name}
          </Typography>
          <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled', lineHeight: 1.3 }}>
            {item.description}
          </Typography>
          <Chip
            label="Coming Soon"
            size="small"
            sx={{
              mt: 0.5,
              alignSelf: 'flex-start',
              bgcolor: alpha(brand[300], 0.12),
              color: brand[400],
              fontWeight: 700,
              fontSize: '0.58rem',
              height: 20,
              border: `1px solid ${alpha(brand[300], 0.3)}`,
            }}
          />
        </Box>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        position: 'relative',
        background: isEquipped
          ? `linear-gradient(135deg, ${alpha(brand[100], 0.9)}, ${alpha(accent[100], 0.5)})`
          : alpha(brand[50], 0.7),
        border: isEquipped
          ? `2.5px solid ${brand[400]}`
          : `1.5px solid ${alpha(brand[300], 0.35)}`,
        borderRadius: 3,
        p: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.25s ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: `0 8px 28px ${alpha(brand[400], 0.2)}`,
          border: `1.5px solid ${alpha(brand[400], 0.5)}`,
        },
      }}
    >
      {/* Preview area — mini card mockup */}
      <Box
        sx={{
          position: 'relative',
          height: { xs: 100, sm: 120 },
          background: isTheme
            ? `linear-gradient(135deg, ${alpha(THEME_COLORS[item.key]?.bg || brand[50], 0.8)}, ${alpha(THEME_COLORS[item.key]?.brand || brand[200], 0.15)})`
            : `linear-gradient(135deg, ${alpha(brand[100], 0.5)}, ${alpha(brand[200], 0.3)})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {isTheme ? (
          <ThemeCardPreview themeKey={item.key} />
        ) : isCelebration ? (
          <Typography sx={{ fontSize: '3rem', lineHeight: 1 }}>{item.emoji}</Typography>
        ) : (
          <BorderCardPreview borderKey={item.key} />
        )}

        {isEquipped && (
          <Box
            sx={{
              position: 'absolute',
              top: 6,
              right: 6,
              bgcolor: '#fff',
              borderRadius: '50%',
              width: 22,
              height: 22,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 2px 8px ${alpha(brand[400], 0.3)}`,
            }}
          >
            <CheckCircleIcon sx={{ fontSize: '0.9rem', color: brand[500] }} />
          </Box>
        )}
        {!owned && !canAfford && item.price > 0 && (
          <Box
            sx={{
              position: 'absolute',
              top: 6,
              left: 6,
              bgcolor: alpha('#000', 0.45),
              borderRadius: 1.5,
              px: 0.7,
              py: 0.25,
              display: 'flex',
              alignItems: 'center',
              gap: 0.3,
            }}
          >
            <LockIcon sx={{ fontSize: '0.65rem', color: '#fff' }} />
            <Typography sx={{ fontSize: '0.55rem', color: '#fff', fontWeight: 700 }}>
              Need {(item.price - spendableXp).toLocaleString()} more
            </Typography>
          </Box>
        )}

        {/* Preview button */}
        <Tooltip title="Preview" arrow>
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); onPreview(); }}
            sx={{
              position: 'absolute',
              bottom: 6,
              right: 6,
              width: 24,
              height: 24,
              bgcolor: 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(4px)',
              border: `1px solid ${alpha(brand[300], 0.4)}`,
              color: brand[600],
              opacity: 0,
              transition: 'opacity 0.2s ease',
              '.MuiPaper-root:hover &': { opacity: 1 },
              '&:hover': { bgcolor: brand[50], color: brand[700] },
            }}
          >
            <VisibilityIcon sx={{ fontSize: '0.8rem' }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Info + action area */}
      <Box sx={{ p: { xs: 1.25, sm: 1.5 }, display: 'flex', flexDirection: 'column', gap: 0.75, flex: 1 }}>
        <Typography
          sx={{
            fontFamily: CUTE_FONT,
            fontSize: { xs: '0.82rem', sm: '0.92rem' },
            color: brand[700],
            lineHeight: 1.2,
          }}
        >
          {item.name}
        </Typography>
        <Typography
          sx={{
            fontSize: '0.65rem',
            color: 'text.secondary',
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {item.description}
        </Typography>

        {/* Price + action row */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5, mt: 'auto', pt: 0.5 }}>
          {/* Price */}
          <Box>
            {item.price > 0 && !owned && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                <AutoAwesomeIcon sx={{ fontSize: '0.75rem', color: canAfford ? '#D97706' : alpha(brand[400], 0.5) }} />
                <Typography
                  sx={{
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    color: canAfford ? '#D97706' : alpha(brand[400], 0.6),
                  }}
                >
                  {item.price.toLocaleString()}
                </Typography>
              </Box>
            )}
            {item.price === 0 && !owned && (
              <Chip
                label="FREE"
                size="small"
                sx={{
                  bgcolor: alpha('#34D399', 0.15),
                  color: '#059669',
                  fontWeight: 800,
                  fontSize: '0.6rem',
                  height: 20,
                  border: '1px solid rgba(52, 211, 153, 0.4)',
                  letterSpacing: '0.05em',
                }}
              />
            )}
            {owned && !isEquipped && item.price > 0 && (
              <Chip
                label="Owned"
                size="small"
                sx={{
                  bgcolor: alpha(brand[300], 0.18),
                  color: brand[600],
                  fontWeight: 700,
                  fontSize: '0.58rem',
                  height: 20,
                  border: `1px solid ${alpha(brand[300], 0.4)}`,
                }}
              />
            )}
          </Box>

          {/* Action */}
          {isEquipped ? (
            <Chip
              icon={<AutoAwesomeIcon sx={{ fontSize: '0.7rem !important' }} />}
              label="Active"
              size="small"
              sx={{
                bgcolor: alpha(brand[400], 0.18),
                color: brand[700],
                fontWeight: 800,
                fontSize: '0.6rem',
                height: 24,
                border: `1px solid ${alpha(brand[400], 0.4)}`,
              }}
            />
          ) : owned ? (
            <Button
              onClick={onEquip}
              size="small"
              variant="outlined"
              sx={{
                fontSize: '0.68rem',
                px: 1.5,
                py: 0.2,
                borderRadius: 2,
                minWidth: 0,
              }}
            >
              Equip
            </Button>
          ) : (
            <Tooltip
              title={canAfford ? '' : 'Keep studying to earn more XP!'}
              arrow
            >
              <span>
                <Button
                  onClick={onBuy}
                  disabled={!canAfford}
                  size="small"
                  variant="contained"
                  sx={{
                    fontSize: '0.72rem',
                    px: 2.5,
                    py: 0.5,
                    borderRadius: 2,
                    minWidth: 0,
                    fontWeight: 700,
                    background: canAfford
                      ? `linear-gradient(135deg, ${brand[300]}, ${brand[500]})`
                      : undefined,
                    '&:hover': canAfford ? {
                      background: `linear-gradient(135deg, ${brand[400]}, ${brand[600]})`,
                    } : undefined,
                  }}
                >
                  Buy
                </Button>
              </span>
            </Tooltip>
          )}
        </Box>
      </Box>
    </Paper>
  );
}

// ─── Coin animation for purchase ─────────────────────────────────────────────

function CoinBurst({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <Box sx={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <Typography
          key={i}
          sx={{
            position: 'absolute',
            fontSize: { xs: '1.2rem', sm: '1.5rem' },
            left: `${15 + Math.random() * 70}%`,
            top: `${40 + Math.random() * 40}%`,
            animation: `${coinBounce} ${0.8 + Math.random() * 0.6}s ease-out forwards`,
            animationDelay: `${Math.random() * 0.3}s`,
          }}
        >
          ⭐
        </Typography>
      ))}
    </Box>
  );
}

// ─── Celebration preview modal ───────────────────────────────────────────────

function CelebrationPreviewModal({
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
  const isDark = particleType !== 'bubbles';
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
      {/* Particle stage */}
      <Box
        sx={{
          position: 'relative',
          height: 300,
          background: bg,
          overflow: 'hidden',
        }}
      >
        <CelebParticleStage itemKey={item.key} />

        {/* Overlay content */}
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
              fontFamily: CUTE_FONT,
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
          sx={{ borderRadius: 2, px: 4, fontFamily: CUTE_FONT }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Category section ────────────────────────────────────────────────────────

function CategorySection({
  title,
  icon,
  items,
  ownsItem,
  equipped,
  spendableXp,
  onBuy,
  onEquip,
  onPreview,
  brandColor,
  expanded,
  compact,
}: {
  title: string;
  icon: React.ReactNode;
  items: ShopItem[];
  ownsItem: (key: string) => boolean;
  equipped: Record<string, string>;
  spendableXp: number;
  onBuy: (item: ShopItem) => void;
  onEquip: (item: ShopItem) => void;
  onPreview: (item: ShopItem) => void;
  brandColor: string;
  expanded?: boolean;
  compact?: boolean;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        position: 'relative',
        border: `1.5px solid ${alpha(brandColor, 0.25)}`,
        borderRadius: 3,
        overflow: 'hidden',
        bgcolor: alpha(brandColor, 0.03),
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          borderBottom: `1px solid ${alpha(brandColor, 0.15)}`,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        {icon}
        <Typography
          sx={{
            fontFamily: CUTE_FONT,
            fontSize: { xs: '1rem', sm: '1.15rem' },
            color: brandColor,
            fontWeight: 700,
          }}
        >
          {title}
        </Typography>
      </Box>

      <Box
        sx={{
          p: { xs: 1.5, sm: 2 },
          display: 'grid',
          gridTemplateColumns: compact
            ? {
                xs: 'repeat(2, 1fr)',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(2, 1fr)',
                lg: 'repeat(3, 1fr)',
              }
            : expanded
              ? {
                  xs: 'repeat(2, 1fr)',
                  sm: 'repeat(3, 1fr)',
                  md: 'repeat(5, 1fr)',
                  lg: 'repeat(6, 1fr)',
                }
              : {
                  xs: 'repeat(2, 1fr)',
                  sm: 'repeat(3, 1fr)',
                  md: 'repeat(4, 1fr)',
                  lg: 'repeat(5, 1fr)',
                },
          gap: 1.5,
        }}
      >
        {items.map((item) => {
          const owned = ownsItem(item.key);
          const slot = item.category;
          const isEquipped = equipped[slot] === item.key
            || (item.price === 0 && !equipped[slot] && item.key === (slot === 'theme' ? 'theme_sakura' : 'border_none'));

          return (
            <ShopItemCard
              key={item.key}
              item={item}
              owned={owned}
              isEquipped={isEquipped}
              spendableXp={spendableXp}
              onBuy={() => onBuy(item)}
              onEquip={() => onEquip(item)}
              onPreview={() => onPreview(item)}
            />
          );
        })}
      </Box>
    </Paper>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function Shop() {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const { progress, spendableXp, loading: progressLoading, refetch: refetchProgress } = useProgress();
  const {
    equipped,
    loading: shopLoading,
    error: shopError,
    ownsItem,
    purchaseItem,
    equipItem,
  } = useShop();
  const { scheme, setScheme } = useColorScheme();

  const [activeCategory, setActiveCategory] = useState<'all' | 'theme' | 'card_border' | 'celebration'>('all');
  const [confirmItem, setConfirmItem] = useState<ShopItem | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showCoinBurst, setShowCoinBurst] = useState(false);
  const [previewingTheme, setPreviewingTheme] = useState<{ item: ShopItem; originalScheme: ColorScheme } | null>(null);
  const [borderPreviewItem, setBorderPreviewItem] = useState<ShopItem | null>(null);
  const [celebPreviewItem, setCelebPreviewItem] = useState<ShopItem | null>(null);

  const loading = progressLoading || shopLoading;
  const themes = SHOP_ITEMS.filter((i) => i.category === 'theme');
  const borders = SHOP_ITEMS.filter((i) => i.category === 'card_border');
  const celebrations = SHOP_ITEMS.filter((i) => i.category === 'celebration');

  const handleBuy = async () => {
    if (!confirmItem) return;
    setPurchasing(true);
    setErrorMsg(null);

    const { error } = await purchaseItem(confirmItem.key, spendableXp);

    if (error) {
      setErrorMsg(error);
    } else {
      setShowCoinBurst(true);
      setSuccessMsg(`${confirmItem.name} unlocked!`);
      const scheme = THEME_KEY_TO_SCHEME[confirmItem.key];
      if (scheme) {
        setScheme(scheme as Parameters<typeof setScheme>[0]);
      }
      await refetchProgress();
      setTimeout(() => setShowCoinBurst(false), 2000);
      setTimeout(() => setSuccessMsg(null), 4000);
    }

    setPurchasing(false);
    setConfirmItem(null);
  };

  const handleEquip = async (item: ShopItem) => {
    const { error } = await equipItem(item.key);
    if (error) {
      setErrorMsg(error);
    } else {
      const s = THEME_KEY_TO_SCHEME[item.key];
      if (s) {
        setScheme(s as Parameters<typeof setScheme>[0]);
      }
    }
  };

  const handlePreview = (item: ShopItem) => {
    if (item.category === 'theme') {
      const targetScheme = THEME_KEY_TO_SCHEME[item.key] as ColorScheme | undefined;
      if (targetScheme) {
        setPreviewingTheme({ item, originalScheme: scheme });
        setScheme(targetScheme);
      }
    } else if (item.category === 'celebration') {
      setCelebPreviewItem(item);
    } else {
      setBorderPreviewItem(item);
    }
  };

  const handleEndThemePreview = () => {
    if (previewingTheme) {
      setScheme(previewingTheme.originalScheme);
      setPreviewingTheme(null);
    }
  };

  return (
    <Box
      sx={{
        px: { xs: 1.5, sm: 3 },
        py: { xs: 2, sm: 4 },
        display: 'flex',
        flexDirection: 'column',
        gap: { xs: 2, sm: 3 },
        position: 'relative',
      }}
    >
      <CoinBurst active={showCoinBurst} />

      {/* ── Hero header ── */}
      <Paper
        elevation={0}
        sx={{
          maxWidth: 1200,
          mx: 'auto',
          width: '100%',
          position: 'relative',
          overflow: 'hidden',
          background: `linear-gradient(145deg, ${alpha(brand[100], 0.9)} 0%, ${alpha(brand[200], 0.6)} 50%, ${alpha(accent[100], 0.4)} 100%)`,
          border: `2px solid ${alpha(brand[300], 0.35)}`,
          borderRadius: 4,
          p: { xs: 2.5, sm: 4 },
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: 'center',
          gap: { xs: 2, sm: 3 },
        }}
      >
        <Sparkles color={brand[300]} count={10} />

        {/* Treasure chest area */}
        <Box
          sx={{
            position: 'relative',
            width: { xs: 80, sm: 110 },
            height: { xs: 80, sm: 110 },
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: `${float} 4s ease-in-out infinite`,
          }}
        >
          <Box
            sx={{
              fontSize: { xs: '3.5rem', sm: '5rem' },
              lineHeight: 1,
              filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))',
            }}
          >
            🎁
          </Box>
          <Typography
            sx={{
              position: 'absolute',
              top: { xs: -4, sm: -8 },
              right: { xs: -4, sm: -8 },
              fontSize: { xs: '1.2rem', sm: '1.5rem' },
              animation: `${sparkle} 2s ease-in-out infinite`,
            }}
          >
            ✨
          </Typography>
          <Typography
            sx={{
              position: 'absolute',
              bottom: { xs: 0, sm: -2 },
              left: { xs: -8, sm: -12 },
              fontSize: { xs: '0.9rem', sm: '1.1rem' },
              animation: `${sparkle} 2.5s ease-in-out infinite 0.5s`,
            }}
          >
            💫
          </Typography>
        </Box>

        {/* Title + subtitle */}
        <Box sx={{ textAlign: { xs: 'center', sm: 'left' }, position: 'relative', zIndex: 1 }}>
          <Typography
            sx={{
              fontFamily: CUTE_FONT,
              fontSize: { xs: '2rem', sm: '2.8rem' },
              color: brand[700],
              lineHeight: 1,
              letterSpacing: '-0.02em',
            }}
          >
            Shop
          </Typography>
          <Typography
            sx={{
              fontFamily: CUTE_FONT,
              fontSize: { xs: '0.82rem', sm: '0.95rem' },
              color: 'text.secondary',
              mt: 0.5,
              fontWeight: 500,
            }}
          >
            Earn XP by studying and unlock treasures!
          </Typography>
        </Box>

        {/* XP wallet badge */}
        <Box sx={{ ml: { sm: 'auto' }, position: 'relative', zIndex: 1 }}>
          {loading ? (
            <Skeleton variant="rounded" width={120} height={60} sx={{ borderRadius: 3 }} />
          ) : progress ? (
            <Box
              sx={{
                background: `linear-gradient(135deg, ${alpha('#FFF', 0.9)}, ${alpha(brand[50], 0.9)})`,
                border: `2px solid ${alpha(brand[300], 0.4)}`,
                borderRadius: 3,
                px: 3,
                py: 1.5,
                textAlign: 'center',
                backdropFilter: 'blur(8px)',
                boxShadow: `0 4px 20px ${alpha(brand[400], 0.15)}`,
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                Your XP
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                <AutoAwesomeIcon sx={{ fontSize: '1rem', color: '#D97706' }} />
                <Typography
                  sx={{
                    fontFamily: CUTE_FONT,
                    fontSize: { xs: '1.6rem', sm: '2rem' },
                    color: '#D97706',
                    lineHeight: 1,
                    fontWeight: 700,
                  }}
                >
                  {spendableXp.toLocaleString()}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary', mt: 0.25 }}>
                Level {progress.level}
              </Typography>
            </Box>
          ) : null}
        </Box>
      </Paper>

      {/* ── Category filter buttons ── */}
      <Box
        sx={{
          maxWidth: 1200,
          mx: 'auto',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          gap: { xs: 2, sm: 3 },
        }}
      >
        <CategoryButton
          icon={<AutoAwesomeIcon />}
          label="All"
          active={activeCategory === 'all'}
          onClick={() => setActiveCategory('all')}
          color={brand[500]}
        />
        <CategoryButton
          icon={<ColorLensIcon />}
          label="Themes"
          active={activeCategory === 'theme'}
          onClick={() => setActiveCategory('theme')}
          color={brand[500]}
        />
        <CategoryButton
          icon={<BorderStyleIcon />}
          label="Borders"
          active={activeCategory === 'card_border'}
          onClick={() => setActiveCategory('card_border')}
          color={brand[500]}
        />
        <CategoryButton
          icon={<CelebrationIcon />}
          label="Celebrations"
          active={activeCategory === 'celebration'}
          onClick={() => setActiveCategory('celebration')}
          color={brand[500]}
        />
      </Box>

      {/* ── Alerts ── */}
      <Box sx={{ maxWidth: 1200, mx: 'auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {successMsg && (
          <Alert
            severity="success"
            onClose={() => setSuccessMsg(null)}
            sx={{
              animation: `${celebrate} 0.4s ease-out`,
              fontSize: '0.88rem',
              fontWeight: 700,
            }}
          >
            {successMsg}
          </Alert>
        )}
        {(errorMsg || shopError) && (
          <Alert severity="error" onClose={() => setErrorMsg(null)}>
            {errorMsg || shopError}
          </Alert>
        )}
      </Box>

      {/* ── Item sections ── */}
      {loading ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 2.5,
            alignItems: 'start',
          }}
        >
          {[0, 1].map((section) => (
            <Paper
              key={section}
              elevation={0}
              sx={{
                border: `1.5px solid ${alpha(brand[300], 0.2)}`,
                borderRadius: 3,
                overflow: 'hidden',
                bgcolor: alpha(brand[50], 0.3),
              }}
            >
              <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${alpha(brand[300], 0.1)}` }}>
                <Skeleton width={100} height={24} />
              </Box>
              <Box sx={{ p: 2, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
                {[0, 1, 2, 3].map((item) => (
                  <Box key={item} sx={{ borderRadius: 3, overflow: 'hidden' }}>
                    <Skeleton variant="rounded" height={90} sx={{ borderRadius: '12px 12px 0 0' }} />
                    <Box sx={{ p: 1.25 }}>
                      <Skeleton width="60%" height={16} />
                      <Skeleton width="80%" height={12} sx={{ mt: 0.5 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                        <Skeleton width={40} height={20} />
                        <Skeleton variant="rounded" width={50} height={24} sx={{ borderRadius: 2 }} />
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Paper>
          ))}
        </Box>
      ) : activeCategory === 'all' ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 2.5,
              alignItems: 'start',
            }}
          >
            <CategorySection
              title="Themes"
              icon={<ColorLensIcon sx={{ fontSize: '1.1rem', color: brand[500] }} />}
              items={themes}
              ownsItem={ownsItem}
              equipped={equipped}
              spendableXp={spendableXp}
              onBuy={setConfirmItem}
              onEquip={handleEquip}
              onPreview={handlePreview}
              brandColor={brand[600]}
              compact
            />
            <CategorySection
              title="Card Borders"
              icon={<BorderStyleIcon sx={{ fontSize: '1.1rem', color: brand[500] }} />}
              items={borders}
              ownsItem={ownsItem}
              equipped={equipped}
              spendableXp={spendableXp}
              onBuy={setConfirmItem}
              onEquip={handleEquip}
              onPreview={handlePreview}
              brandColor={brand[600]}
              compact
            />
          </Box>
          <CategorySection
            title="Celebrations"
            icon={<CelebrationIcon sx={{ fontSize: '1.1rem', color: brand[500] }} />}
            items={celebrations}
            ownsItem={ownsItem}
            equipped={equipped}
            spendableXp={spendableXp}
            onBuy={setConfirmItem}
            onEquip={handleEquip}
            onPreview={handlePreview}
            brandColor={brand[600]}
            compact
          />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {activeCategory === 'theme' && (
            <CategorySection
              title="Themes"
              icon={<ColorLensIcon sx={{ fontSize: '1.1rem', color: brand[500] }} />}
              items={themes}
              ownsItem={ownsItem}
              equipped={equipped}
              spendableXp={spendableXp}
              onBuy={setConfirmItem}
              onEquip={handleEquip}
              onPreview={handlePreview}
              brandColor={brand[600]}
              expanded
            />
          )}
          {activeCategory === 'card_border' && (
            <CategorySection
              title="Card Borders"
              icon={<BorderStyleIcon sx={{ fontSize: '1.1rem', color: brand[500] }} />}
              items={borders}
              ownsItem={ownsItem}
              equipped={equipped}
              spendableXp={spendableXp}
              onBuy={setConfirmItem}
              onEquip={handleEquip}
              onPreview={handlePreview}
              brandColor={brand[600]}
              expanded
            />
          )}
          {activeCategory === 'celebration' && (
            <CategorySection
              title="Celebrations"
              icon={<CelebrationIcon sx={{ fontSize: '1.1rem', color: brand[500] }} />}
              items={celebrations}
              ownsItem={ownsItem}
              equipped={equipped}
              spendableXp={spendableXp}
              onBuy={setConfirmItem}
              onEquip={handleEquip}
              onPreview={handlePreview}
              brandColor={brand[600]}
              expanded
            />
          )}
        </Box>
      )}

      {/* ── Motivational footer ── */}
      {!loading && progress && spendableXp < 500 && (
        <Paper
          elevation={0}
          sx={{
            maxWidth: 1200,
            mx: 'auto',
            width: '100%',
            textAlign: 'center',
            py: 2,
            px: 3,
            background: `linear-gradient(135deg, ${alpha(brand[100], 0.5)}, ${alpha(accent[100], 0.3)})`,
            border: `1px solid ${alpha(brand[300], 0.2)}`,
            borderRadius: 3,
          }}
        >
          <AutoAwesomeIcon sx={{ fontSize: '1.4rem', color: brand[400], mb: 0.5 }} />
          <Typography
            sx={{
              fontFamily: CUTE_FONT,
              fontSize: '0.82rem',
              color: brand[700],
              fontWeight: 600,
            }}
          >
            Keep studying to earn more XP!
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mt: 0.25 }}>
            Every card you practice earns you coins for the shop
          </Typography>
        </Paper>
      )}

      {/* ── Purchase confirmation dialog ── */}
      <Dialog
        open={!!confirmItem}
        onClose={() => { if (!purchasing) setConfirmItem(null); }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 4,
              border: `2px solid ${alpha(brand[300], 0.35)}`,
              boxShadow: `0 12px 48px ${alpha(brand[700], 0.15)}`,
              bgcolor: theme.palette.surfaces.overlay,
              minWidth: { xs: 300, sm: 380 },
              overflow: 'visible',
              position: 'relative',
            },
          },
        }}
      >
        {confirmItem && (
          <>
            {/* Floating preview */}
            <Box
              sx={{
                position: 'absolute',
                top: -32,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 64,
                height: 64,
                borderRadius: 3,
                bgcolor: alpha(brand[100], 0.95),
                border: `2px solid ${alpha(brand[300], 0.4)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 4px 16px ${alpha(brand[400], 0.2)}`,
                animation: `${float} 3s ease-in-out infinite`,
                overflow: 'hidden',
              }}
            >
              {confirmItem.category === 'theme' ? (
                <ThemeCardPreview themeKey={confirmItem.key} />
              ) : confirmItem.category === 'celebration' ? (
                <Typography sx={{ fontSize: '2.2rem', lineHeight: 1 }}>{confirmItem.emoji}</Typography>
              ) : (
                <BorderCardPreview borderKey={confirmItem.key} />
              )}
            </Box>

            <DialogTitle
              sx={{
                fontFamily: CUTE_FONT,
                color: brand[700],
                textAlign: 'center',
                pt: 6,
                pb: 1,
                fontSize: '1.2rem',
              }}
            >
              Unlock {confirmItem.name}?
            </DialogTitle>
            <DialogContent>
              <Typography
                sx={{ fontSize: '0.82rem', color: 'text.secondary', textAlign: 'center', mb: 2.5 }}
              >
                {confirmItem.description}
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.75,
                  bgcolor: alpha(brand[50], 0.8),
                  borderRadius: 3,
                  p: 2,
                  border: `1.5px solid ${alpha(brand[300], 0.25)}`,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>Cost</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                    <AutoAwesomeIcon sx={{ fontSize: '0.8rem', color: '#D97706' }} />
                    <Typography sx={{ fontSize: '0.88rem', fontWeight: 800, color: '#D97706' }}>
                      {confirmItem.price.toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>Your balance</Typography>
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: 'text.primary' }}>
                    {spendableXp.toLocaleString()} XP
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    pt: 0.75,
                    borderTop: `1px solid ${alpha(brand[300], 0.25)}`,
                  }}
                >
                  <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>After purchase</Typography>
                  <Typography
                    sx={{
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      color: spendableXp - confirmItem.price >= 0 ? '#059669' : '#DC2626',
                    }}
                  >
                    {(spendableXp - confirmItem.price).toLocaleString()} XP
                  </Typography>
                </Box>
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3, gap: 1, justifyContent: 'center' }}>
              <Button
                onClick={() => setConfirmItem(null)}
                disabled={purchasing}
                sx={{
                  color: 'text.secondary',
                  textTransform: 'none',
                  borderRadius: 2,
                  px: 3,
                }}
              >
                Maybe later
              </Button>
              <Button
                onClick={handleBuy}
                disabled={purchasing || spendableXp < confirmItem.price}
                variant="contained"
                sx={{
                  textTransform: 'none',
                  borderRadius: 2,
                  px: 4,
                  py: 1,
                  fontFamily: CUTE_FONT,
                  fontSize: '0.95rem',
                  background: `linear-gradient(135deg, ${brand[300]}, ${brand[500]})`,
                  boxShadow: `0 4px 16px ${alpha(brand[400], 0.3)}`,
                  '&:hover': {
                    background: `linear-gradient(135deg, ${brand[400]}, ${brand[600]})`,
                    boxShadow: `0 6px 20px ${alpha(brand[400], 0.4)}`,
                  },
                }}
              >
                {purchasing ? 'Unlocking...' : 'Unlock!'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── Theme preview banner ── */}
      {previewingTheme && (
        <Paper
          elevation={3}
          sx={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1300,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            px: 3,
            py: 1.5,
            borderRadius: 3,
            border: `2px solid ${alpha(brand[400], 0.5)}`,
            bgcolor: theme.palette.surfaces.overlay,
            backdropFilter: 'blur(12px)',
            boxShadow: `0 8px 32px ${alpha(brand[700], 0.2)}`,
            animation: `${celebrate} 0.3s ease-out`,
          }}
        >
          <VisibilityIcon sx={{ color: brand[500], fontSize: '1.2rem' }} />
          <Typography sx={{ fontFamily: CUTE_FONT, fontSize: '0.9rem', color: brand[700] }}>
            Previewing <strong>{previewingTheme.item.name}</strong>
          </Typography>
          <Button
            onClick={handleEndThemePreview}
            size="small"
            variant="outlined"
            sx={{ borderRadius: 2, fontFamily: CUTE_FONT, fontSize: '0.78rem', px: 2, minWidth: 0 }}
          >
            End Preview
          </Button>
        </Paper>
      )}

      {/* ── Border preview modal ── */}
      <BorderPreviewModal
        open={!!borderPreviewItem}
        onClose={() => setBorderPreviewItem(null)}
        borderKey={borderPreviewItem?.key ?? 'border_none'}
        borderName={borderPreviewItem?.name ?? ''}
      />

      {/* ── Celebration preview modal ── */}
      <CelebrationPreviewModal
        open={!!celebPreviewItem}
        onClose={() => setCelebPreviewItem(null)}
        item={celebPreviewItem}
      />
    </Box>
  );
}

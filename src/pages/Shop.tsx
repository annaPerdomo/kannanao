'use client';

import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Skeleton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import BorderStyleIcon from '@mui/icons-material/BorderStyle';
import CelebrationIcon from '@mui/icons-material/Celebration';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useProgress } from '@/hooks/useProgress';
import { useShop, SHOP_ITEMS, THEME_KEY_TO_SCHEME } from '@/hooks/useShop';
import { useColorScheme } from '@/contexts/ThemeContext';
import { CUTE_FONT, type ColorScheme } from '@/theme';
import type { ShopItem } from '@/types/shop';
import { float, celebrate } from '@/components/Shop/animations';
import { Sparkles } from '@/components/Shop/Sparkles';
import { CoinBurst } from '@/components/Shop/CoinBurst';
import { ThemeCardPreview } from '@/components/Shop/ThemeCardPreview';
import { BorderCardPreview } from '@/components/Shop/BorderCardPreview';
import { BorderPreviewModal } from '@/components/Shop/BorderPreviewModal';
import { CelebrationPreviewModal } from '@/components/Shop/CelebrationPreviewModal';
import { CategoryButton } from '@/components/Shop/CategoryButton';
import { CategorySection } from '@/components/Shop/CategorySection';

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
  const themes = useMemo(() => SHOP_ITEMS.filter((i) => i.category === 'theme'), []);
  const borders = useMemo(() => SHOP_ITEMS.filter((i) => i.category === 'card_border'), []);
  const celebrations = useMemo(() => SHOP_ITEMS.filter((i) => i.category === 'celebration'), []);

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

      {/* Hero header */}
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
          <Box sx={{ fontSize: { xs: '3.5rem', sm: '5rem' }, lineHeight: 1, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))' }}>
            🎁
          </Box>
        </Box>

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

      {/* Category filter buttons */}
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
        <CategoryButton icon={<AutoAwesomeIcon />} label="All" active={activeCategory === 'all'} onClick={() => setActiveCategory('all')} color={brand[500]} />
        <CategoryButton icon={<ColorLensIcon />} label="Themes" active={activeCategory === 'theme'} onClick={() => setActiveCategory('theme')} color={brand[500]} />
        <CategoryButton icon={<BorderStyleIcon />} label="Borders" active={activeCategory === 'card_border'} onClick={() => setActiveCategory('card_border')} color={brand[500]} />
        <CategoryButton icon={<CelebrationIcon />} label="Celebrations" active={activeCategory === 'celebration'} onClick={() => setActiveCategory('celebration')} color={brand[500]} />
      </Box>

      {/* Alerts */}
      <Box sx={{ maxWidth: 1200, mx: 'auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {successMsg && (
          <Alert severity="success" onClose={() => setSuccessMsg(null)} sx={{ animation: `${celebrate} 0.4s ease-out`, fontSize: '0.88rem', fontWeight: 700 }}>
            {successMsg}
          </Alert>
        )}
        {(errorMsg || shopError) && (
          <Alert severity="error" onClose={() => setErrorMsg(null)}>
            {errorMsg || shopError}
          </Alert>
        )}
      </Box>

      {/* Item sections */}
      {loading ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5, alignItems: 'start' }}>
          {[0, 1].map((section) => (
            <Paper key={section} elevation={0} sx={{ border: `1.5px solid ${alpha(brand[300], 0.2)}`, borderRadius: 3, overflow: 'hidden', bgcolor: alpha(brand[50], 0.3) }}>
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
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5, alignItems: 'start' }}>
            <CategorySection title="Themes" icon={<ColorLensIcon sx={{ fontSize: '1.1rem', color: brand[500] }} />} items={themes} ownsItem={ownsItem} equipped={equipped} spendableXp={spendableXp} onBuy={setConfirmItem} onEquip={handleEquip} onPreview={handlePreview} brandColor={brand[600]} compact />
            <CategorySection title="Card Borders" icon={<BorderStyleIcon sx={{ fontSize: '1.1rem', color: brand[500] }} />} items={borders} ownsItem={ownsItem} equipped={equipped} spendableXp={spendableXp} onBuy={setConfirmItem} onEquip={handleEquip} onPreview={handlePreview} brandColor={brand[600]} compact />
          </Box>
          <CategorySection title="Celebrations" icon={<CelebrationIcon sx={{ fontSize: '1.1rem', color: brand[500] }} />} items={celebrations} ownsItem={ownsItem} equipped={equipped} spendableXp={spendableXp} onBuy={setConfirmItem} onEquip={handleEquip} onPreview={handlePreview} brandColor={brand[600]} compact />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {activeCategory === 'theme' && (
            <CategorySection title="Themes" icon={<ColorLensIcon sx={{ fontSize: '1.1rem', color: brand[500] }} />} items={themes} ownsItem={ownsItem} equipped={equipped} spendableXp={spendableXp} onBuy={setConfirmItem} onEquip={handleEquip} onPreview={handlePreview} brandColor={brand[600]} expanded />
          )}
          {activeCategory === 'card_border' && (
            <CategorySection title="Card Borders" icon={<BorderStyleIcon sx={{ fontSize: '1.1rem', color: brand[500] }} />} items={borders} ownsItem={ownsItem} equipped={equipped} spendableXp={spendableXp} onBuy={setConfirmItem} onEquip={handleEquip} onPreview={handlePreview} brandColor={brand[600]} expanded />
          )}
          {activeCategory === 'celebration' && (
            <CategorySection title="Celebrations" icon={<CelebrationIcon sx={{ fontSize: '1.1rem', color: brand[500] }} />} items={celebrations} ownsItem={ownsItem} equipped={equipped} spendableXp={spendableXp} onBuy={setConfirmItem} onEquip={handleEquip} onPreview={handlePreview} brandColor={brand[600]} expanded />
          )}
        </Box>
      )}

      {/* Motivational footer */}
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
          <Typography sx={{ fontFamily: CUTE_FONT, fontSize: '0.82rem', color: brand[700], fontWeight: 600 }}>
            Keep studying to earn more XP!
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mt: 0.25 }}>
            Every card you practice earns you coins for the shop
          </Typography>
        </Paper>
      )}

      {/* Purchase confirmation dialog */}
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

            <DialogTitle sx={{ fontFamily: CUTE_FONT, color: brand[700], textAlign: 'center', pt: 6, pb: 1, fontSize: '1.2rem' }}>
              Unlock {confirmItem.name}?
            </DialogTitle>
            <DialogContent>
              <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', textAlign: 'center', mb: 2.5 }}>
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 0.75, borderTop: `1px solid ${alpha(brand[300], 0.25)}` }}>
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
              <Button onClick={() => setConfirmItem(null)} disabled={purchasing} sx={{ color: 'text.secondary', textTransform: 'none', borderRadius: 2, px: 3 }}>
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

      {/* Theme preview banner */}
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

      <BorderPreviewModal
        open={!!borderPreviewItem}
        onClose={() => setBorderPreviewItem(null)}
        borderKey={borderPreviewItem?.key ?? 'border_none'}
        borderName={borderPreviewItem?.name ?? ''}
      />

      <CelebrationPreviewModal
        open={!!celebPreviewItem}
        onClose={() => setCelebPreviewItem(null)}
        item={celebPreviewItem}
      />
    </Box>
  );
}

'use client';

import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BorderStyleIcon from '@mui/icons-material/BorderStyle';
import CelebrationIcon from '@mui/icons-material/Celebration';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import PetsIcon from '@mui/icons-material/Pets';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Skeleton,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { useMemo, useState } from 'react';

import { Loading } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { celebrate, float } from '@/components/Shop/animations';
import { BorderCardPreview } from '@/components/Shop/BorderCardPreview';
import { BorderPreviewModal } from '@/components/Shop/BorderPreviewModal';
import { BuddyPreviewModal } from '@/components/Shop/BuddyPreviewModal';
import { CategoryButton } from '@/components/Shop/CategoryButton';
import { CategorySection } from '@/components/Shop/CategorySection';
import { CelebrationPreviewModal } from '@/components/Shop/CelebrationPreviewModal';
import { CoinBurst } from '@/components/Shop/CoinBurst';
import { Sparkles } from '@/components/Shop/Sparkles';
import { ThemeCardPreview } from '@/components/Shop/ThemeCardPreview';
import { useColorScheme } from '@/contexts/ThemeContext';
import { useProgress } from '@/hooks/useProgress';
import { SHOP_ITEMS, THEME_KEY_TO_SCHEME, useShop } from '@/hooks/useShop';
import { type ColorScheme, LAYOUT } from '@/theme';
import type { ShopCategory, ShopItem } from '@/types/shop';

export default function Shop() {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const {
    progress,
    spendableXp,
    loading: progressLoading,
    refetch: refetchProgress,
  } = useProgress();
  const {
    equipped,
    loading: shopLoading,
    error: shopError,
    ownsItem,
    purchaseItem,
    equipItem,
  } = useShop();
  const { scheme, setScheme } = useColorScheme();

  const activeThemeKey = useMemo(() => {
    const entry = Object.entries(THEME_KEY_TO_SCHEME).find(([, s]) => s === scheme);
    return entry?.[0] ?? 'theme_sakura';
  }, [scheme]);

  const [activeCategory, setActiveCategory] = useState<'all' | ShopCategory>('all');
  const [confirmItem, setConfirmItem] = useState<ShopItem | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showCoinBurst, setShowCoinBurst] = useState(false);
  const [previewingTheme, setPreviewingTheme] = useState<{
    item: ShopItem;
    originalScheme: ColorScheme;
  } | null>(null);
  const [borderPreviewItem, setBorderPreviewItem] = useState<ShopItem | null>(null);
  const [celebPreviewItem, setCelebPreviewItem] = useState<ShopItem | null>(null);
  const [buddyPreviewItem, setBuddyPreviewItem] = useState<ShopItem | null>(null);

  const loading = progressLoading || shopLoading;
  const categories = useMemo(
    () => [
      {
        key: 'theme' as const,
        title: 'Themes',
        icon: <ColorLensIcon sx={{ fontSize: '1.1rem', color: brand[500] }} />,
        filterIcon: <ColorLensIcon />,
        filterLabel: 'Themes',
      },
      {
        key: 'card_border' as const,
        title: 'Card Borders',
        icon: <BorderStyleIcon sx={{ fontSize: '1.1rem', color: brand[500] }} />,
        filterIcon: <BorderStyleIcon />,
        filterLabel: 'Borders',
      },
      {
        key: 'celebration' as const,
        title: 'Celebrations',
        icon: <CelebrationIcon sx={{ fontSize: '1.1rem', color: brand[500] }} />,
        filterIcon: <CelebrationIcon />,
        filterLabel: 'Celebrations',
      },
      {
        key: 'study_buddy' as const,
        title: 'Study Buddies',
        icon: <PetsIcon sx={{ fontSize: '1.1rem', color: brand[500] }} />,
        filterIcon: <PetsIcon />,
        filterLabel: 'Buddies',
      },
    ],
    [brand],
  );

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, ShopItem[]>();
    for (const cat of categories) {
      map.set(
        cat.key,
        SHOP_ITEMS.filter((i) => i.category === cat.key),
      );
    }
    return map;
  }, [categories]);

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
    } else if (item.category === 'study_buddy') {
      setBuddyPreviewItem(item);
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
        maxWidth: LAYOUT.contentMaxWidth,
        mx: 'auto',
        px: LAYOUT.pagePx,
        py: { xs: 2, sm: 4 },
        display: 'flex',
        flexDirection: 'column',
        gap: { xs: 2, sm: 3 },
        position: 'relative',
      }}
    >
      <CoinBurst active={showCoinBurst} />

      {/* Hero header */}
      <Box
        sx={{ maxWidth: LAYOUT.headerMaxWidth, mx: 'auto', width: '100%', position: 'relative' }}
      >
        <Sparkles color={brand[300]} count={10} />
        <PageHeader
          emoji="🎁"
          title="Shop"
          subtitle="Earn XP by studying and unlock treasures!"
          mb={0}
          endContent={
            loading ? (
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
                <Box
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}
                >
                  <AutoAwesomeIcon sx={{ fontSize: '1rem', color: '#D97706' }} />
                  <Typography
                    sx={{
                      fontFamily: (t) => t.fonts.cute,
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
            ) : null
          }
        />
      </Box>

      {/* Category filter buttons */}
      <Box
        sx={{
          maxWidth: LAYOUT.headerMaxWidth,
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
        {categories.map((cat) => (
          <CategoryButton
            key={cat.key}
            icon={cat.filterIcon}
            label={cat.filterLabel}
            active={activeCategory === cat.key}
            onClick={() => setActiveCategory(cat.key)}
            color={brand[500]}
          />
        ))}
      </Box>

      {/* Alerts */}
      <Box
        sx={{
          maxWidth: LAYOUT.headerMaxWidth,
          mx: 'auto',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
        }}
      >
        {successMsg && (
          <Alert
            severity="success"
            onClose={() => setSuccessMsg(null)}
            sx={{ animation: `${celebrate} 0.4s ease-out`, fontSize: '0.88rem', fontWeight: 700 }}
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

      {/* Item sections */}
      {loading ? (
        <Box sx={{ position: 'relative' }}>
          <Box
            sx={{
              width: '100%',
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: '1fr 1fr',
                lg: `repeat(${categories.length}, 1fr)`,
              },
              gap: 2,
              alignItems: 'start',
              filter: 'blur(2px)',
              opacity: 0.6,
            }}
          >
            {categories.map((cat) => (
              <Paper
                key={cat.key}
                elevation={0}
                sx={{
                  border: `1.5px solid ${alpha(brand[300], 0.2)}`,
                  borderRadius: 3,
                  overflow: 'hidden',
                  bgcolor: alpha(brand[50], 0.3),
                }}
              >
                <Box
                  sx={{
                    px: 2,
                    py: 1.5,
                    borderBottom: `1px solid ${alpha(brand[300], 0.1)}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Skeleton variant="circular" width={20} height={20} />
                  <Skeleton width={80} height={22} />
                </Box>
                <Box
                  sx={{ p: 1.5, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}
                >
                  {[0, 1, 2, 3].map((item) => (
                    <Box
                      key={item}
                      sx={{
                        borderRadius: 2.5,
                        overflow: 'hidden',
                        bgcolor: alpha(brand[50], 0.5),
                        border: `1px solid ${alpha(brand[300], 0.15)}`,
                      }}
                    >
                      <Skeleton variant="rounded" height={65} sx={{ borderRadius: 0 }} />
                      <Box sx={{ p: 0.75 }}>
                        <Skeleton width="65%" height={14} />
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            mt: 0.5,
                          }}
                        >
                          <Skeleton width={30} height={16} />
                          <Skeleton
                            variant="rounded"
                            width={38}
                            height={20}
                            sx={{ borderRadius: 1.5 }}
                          />
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </Box>
                <Box sx={{ px: 2, pb: 1.5, pt: 0.5 }}>
                  <Skeleton width={90} height={16} />
                </Box>
              </Paper>
            ))}
          </Box>
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
            }}
          >
            <Loading message="Loading shop…" />
          </Box>
        </Box>
      ) : activeCategory === 'all' ? (
        <Box
          sx={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: '1fr 1fr',
              lg: `repeat(${categories.length}, 1fr)`,
            },
            gap: 2,
            alignItems: 'start',
          }}
        >
          {categories.map((cat) => (
            <CategorySection
              key={cat.key}
              title={cat.title}
              icon={cat.icon}
              items={itemsByCategory.get(cat.key) ?? []}
              ownsItem={ownsItem}
              equipped={equipped}
              activeThemeKey={activeThemeKey}
              spendableXp={spendableXp}
              onBuy={setConfirmItem}
              onEquip={handleEquip}
              onPreview={handlePreview}
              brandColor={brand[600]}
              overview
              onSeeAll={() => setActiveCategory(cat.key)}
            />
          ))}
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {categories
            .filter((cat) => cat.key === activeCategory)
            .map((cat) => (
              <CategorySection
                key={cat.key}
                title={cat.title}
                icon={cat.icon}
                items={itemsByCategory.get(cat.key) ?? []}
                ownsItem={ownsItem}
                equipped={equipped}
                activeThemeKey={activeThemeKey}
                spendableXp={spendableXp}
                onBuy={setConfirmItem}
                onEquip={handleEquip}
                onPreview={handlePreview}
                brandColor={brand[600]}
                expanded
              />
            ))}
        </Box>
      )}

      {/* Motivational footer */}
      {!loading && progress && spendableXp < 500 && (
        <Paper
          elevation={0}
          sx={{
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
              fontFamily: (t) => t.fonts.cute,
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

      {/* Purchase confirmation dialog */}
      <Dialog
        open={!!confirmItem}
        onClose={() => {
          if (!purchasing) setConfirmItem(null);
        }}
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
              ) : confirmItem.category === 'celebration' ||
                confirmItem.category === 'study_buddy' ? (
                <Typography sx={{ fontSize: '2.2rem', lineHeight: 1 }}>
                  {confirmItem.emoji}
                </Typography>
              ) : (
                <BorderCardPreview borderKey={confirmItem.key} />
              )}
            </Box>

            <DialogTitle
              sx={{
                fontFamily: (t) => t.fonts.cute,
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
                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
                    Cost
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                    <AutoAwesomeIcon sx={{ fontSize: '0.8rem', color: '#D97706' }} />
                    <Typography sx={{ fontSize: '0.88rem', fontWeight: 800, color: '#D97706' }}>
                      {confirmItem.price.toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
                    Your balance
                  </Typography>
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
                  <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
                    After purchase
                  </Typography>
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
                sx={{ color: 'text.secondary', textTransform: 'none', borderRadius: 2, px: 3 }}
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
                  fontFamily: (t) => t.fonts.cute,
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
          <Typography
            sx={{ fontFamily: (t) => t.fonts.cute, fontSize: '0.9rem', color: brand[700] }}
          >
            Previewing <strong>{previewingTheme.item.name}</strong>
          </Typography>
          <Button
            onClick={handleEndThemePreview}
            size="small"
            variant="outlined"
            sx={{
              borderRadius: 2,
              fontFamily: (t) => t.fonts.cute,
              fontSize: '0.78rem',
              px: 2,
              minWidth: 0,
            }}
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

      <BuddyPreviewModal
        open={!!buddyPreviewItem}
        onClose={() => setBuddyPreviewItem(null)}
        item={buddyPreviewItem}
      />
    </Box>
  );
}

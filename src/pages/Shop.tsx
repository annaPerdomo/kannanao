'use client';

import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BorderStyleIcon from '@mui/icons-material/BorderStyle';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
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
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { LoadingOverlay } from '@/components/Loading';
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
import { useProgressCtx } from '@/contexts/ProgressContext';
import { useShopCtx } from '@/contexts/ShopContext';
import { useColorScheme } from '@/contexts/ThemeContext';
import { SHOP_ITEMS, THEME_KEY_TO_SCHEME } from '@/hooks/useShop';
import { buddyFaceSrc } from '@/lib/buddies';
import { type ColorScheme, LAYOUT } from '@/theme';
import type { ShopCategory, ShopItem } from '@/types/shop';

export default function Shop({ embedded = false }: { embedded?: boolean } = {}) {
  const router = useRouter();
  const t = useTranslations('Shop');
  const tItems = useTranslations('Shop.items');
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  // The shared ProgressContext instance — using the hook directly here would
  // spin up a second copy whose post-purchase refetch the navbar XP display
  // (which reads the context) never sees.
  const {
    progress,
    spendableXp,
    loading: progressLoading,
    refetch: refetchProgress,
  } = useProgressCtx();
  const {
    equipped,
    loading: shopLoading,
    error: shopError,
    ownsItem,
    purchaseItem,
    equipItem,
  } = useShopCtx();
  const { scheme, setScheme, previewScheme } = useColorScheme();

  // ProgressContext lives in AppShell and only fetches once per hard load, so a
  // session studied since then would leave the balance here behind the navbar's.
  useEffect(() => {
    void refetchProgress();
  }, [refetchProgress]);

  // Safety net: never leave a try-on theme applied after leaving the shop.
  useEffect(() => () => previewScheme(null), [previewScheme]);

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
  const [previewingTheme, setPreviewingTheme] = useState<ShopItem | null>(null);
  const [borderPreviewItem, setBorderPreviewItem] = useState<ShopItem | null>(null);
  const [celebPreviewItem, setCelebPreviewItem] = useState<ShopItem | null>(null);
  const [buddyPreviewItem, setBuddyPreviewItem] = useState<ShopItem | null>(null);

  const loading = progressLoading || shopLoading;
  const categories = useMemo(
    () => [
      {
        key: 'theme' as const,
        title: t('categories.themes'),
        icon: <ColorLensIcon sx={{ fontSize: '1.1rem', color: brand[500] }} />,
        filterIcon: <ColorLensIcon />,
        filterLabel: t('categories.themes'),
      },
      {
        key: 'card_border' as const,
        title: t('categories.cardBorders'),
        icon: <BorderStyleIcon sx={{ fontSize: '1.1rem', color: brand[500] }} />,
        filterIcon: <BorderStyleIcon />,
        filterLabel: t('categories.bordersFilter'),
      },
      {
        key: 'celebration' as const,
        title: t('categories.celebrations'),
        icon: <CelebrationIcon sx={{ fontSize: '1.1rem', color: brand[500] }} />,
        filterIcon: <CelebrationIcon />,
        filterLabel: t('categories.celebrations'),
      },
      {
        key: 'study_buddy' as const,
        title: t('categories.studyBuddies'),
        icon: <PetsIcon sx={{ fontSize: '1.1rem', color: brand[500] }} />,
        filterIcon: <PetsIcon />,
        filterLabel: t('categories.buddiesFilter'),
      },
    ],
    [brand, t],
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
      // A failure often means our balance was stale to begin with — resync so
      // the price the learner is looking at stops lying to them.
      await refetchProgress();
    } else {
      setShowCoinBurst(true);
      setSuccessMsg(t('itemUnlocked', { name: tItems(`${confirmItem.key}.name`) }));
      const scheme = THEME_KEY_TO_SCHEME[confirmItem.key];
      if (scheme) {
        // setScheme also ends any active try-on preview, so the banner has to go
        // with it — otherwise its "End preview" button no-ops forever.
        setScheme(scheme as Parameters<typeof setScheme>[0]);
        setPreviewingTheme(null);
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
        setPreviewingTheme(null);
      }
    }
  };

  const handlePreview = (item: ShopItem) => {
    if (item.category === 'theme') {
      const targetScheme = THEME_KEY_TO_SCHEME[item.key] as ColorScheme | undefined;
      if (targetScheme) {
        setPreviewingTheme(item);
        // Render-only try-on — nothing is persisted until the theme is bought.
        previewScheme(targetScheme);
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
    previewScheme(null);
    setPreviewingTheme(null);
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
          icon={<CardGiftcardIcon />}
          title={t('title')}
          subtitle={t('subtitle')}
          onBack={embedded ? undefined : () => router.push('/')}
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
                  {t('yourXp')}
                </Typography>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}
                >
                  <AutoAwesomeIcon sx={{ fontSize: '1rem', color: '#D97706' }} />
                  <Typography
                    sx={{
                      fontFamily: (muiTheme) => muiTheme.fonts.cute,
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
                  {t('level', { level: progress.level })}
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
          label={t('categories.all')}
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
        <LoadingOverlay message={t('loadingShop')}>
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
        </LoadingOverlay>
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
              fontFamily: (muiTheme) => muiTheme.fonts.cute,
              fontSize: '0.82rem',
              color: brand[700],
              fontWeight: 600,
            }}
          >
            {t('keepStudying')}
          </Typography>
          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mt: 0.25 }}>
            {t('everyCardEarnsCoins')}
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
              ) : confirmItem.category === 'study_buddy' ? (
                <Box
                  component="img"
                  src={buddyFaceSrc(confirmItem.key, 1)}
                  alt=""
                  sx={{ width: 52, height: 52, objectFit: 'contain' }}
                />
              ) : confirmItem.category === 'celebration' ? (
                <Typography sx={{ fontSize: '2.2rem', lineHeight: 1 }}>
                  {confirmItem.emoji}
                </Typography>
              ) : (
                <BorderCardPreview borderKey={confirmItem.key} />
              )}
            </Box>

            <DialogTitle
              sx={{
                fontFamily: (muiTheme) => muiTheme.fonts.cute,
                color: brand[700],
                textAlign: 'center',
                pt: 6,
                pb: 1,
                fontSize: '1.2rem',
              }}
            >
              {t('purchaseDialog.unlockTitle', { name: tItems(`${confirmItem.key}.name`) })}
            </DialogTitle>
            <DialogContent>
              <Typography
                sx={{
                  fontSize: '0.82rem',
                  color: 'text.secondary',
                  textAlign: 'center',
                  mb: confirmItem.category === 'study_buddy' ? 1.25 : 2.5,
                }}
              >
                {tItems(`${confirmItem.key}.description`)}
              </Typography>
              {confirmItem.category === 'study_buddy' && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.75,
                    mb: 2.5,
                  }}
                >
                  <Box sx={{ display: 'flex' }}>
                    {[2, 3, 4].map((v) => (
                      <Box
                        key={v}
                        component="img"
                        src={buddyFaceSrc(confirmItem.key, v)}
                        alt=""
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          bgcolor: '#fff',
                          border: `1.5px solid ${alpha(brand[300], 0.6)}`,
                          objectFit: 'contain',
                          '&:not(:first-of-type)': { ml: '-10px' },
                        }}
                      />
                    ))}
                  </Box>
                  <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: brand[600] }}>
                    {t('purchaseDialog.avatarPerk')}
                  </Typography>
                </Box>
              )}
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
                    {t('purchaseDialog.cost')}
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
                    {t('purchaseDialog.yourBalance')}
                  </Typography>
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: 'text.primary' }}>
                    {t('purchaseDialog.balanceXp', { amount: spendableXp.toLocaleString() })}
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
                    {t('purchaseDialog.afterPurchase')}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      color: spendableXp - confirmItem.price >= 0 ? '#059669' : '#DC2626',
                    }}
                  >
                    {t('purchaseDialog.balanceXp', {
                      amount: (spendableXp - confirmItem.price).toLocaleString(),
                    })}
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
                {t('purchaseDialog.maybeLater')}
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
                  fontFamily: (muiTheme) => muiTheme.fonts.cute,
                  fontSize: '0.95rem',
                  background: `linear-gradient(135deg, ${brand[300]}, ${brand[500]})`,
                  boxShadow: `0 4px 16px ${alpha(brand[400], 0.3)}`,
                  '&:hover': {
                    background: `linear-gradient(135deg, ${brand[400]}, ${brand[600]})`,
                    boxShadow: `0 6px 20px ${alpha(brand[400], 0.4)}`,
                  },
                }}
              >
                {purchasing ? t('purchaseDialog.unlocking') : t('purchaseDialog.unlock')}
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
            sx={{
              fontFamily: (muiTheme) => muiTheme.fonts.cute,
              fontSize: '0.9rem',
              color: brand[700],
            }}
          >
            {t.rich('previewingBanner.previewing', {
              name: tItems(`${previewingTheme.key}.name`),
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </Typography>
          <Button
            onClick={handleEndThemePreview}
            size="small"
            variant="outlined"
            sx={{
              borderRadius: 2,
              fontFamily: (muiTheme) => muiTheme.fonts.cute,
              fontSize: '0.78rem',
              px: 2,
              minWidth: 0,
            }}
          >
            {t('previewingBanner.endPreview')}
          </Button>
        </Paper>
      )}

      <BorderPreviewModal
        open={!!borderPreviewItem}
        onClose={() => setBorderPreviewItem(null)}
        borderKey={borderPreviewItem?.key ?? 'border_none'}
        borderName={borderPreviewItem ? tItems(`${borderPreviewItem.key}.name`) : ''}
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

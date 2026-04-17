'use client';

import { useState } from 'react';
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
  Tabs,
  Tab,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import StorefrontIcon from '@mui/icons-material/Storefront';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useProgress } from '@/hooks/useProgess';
import { useShop, SHOP_ITEMS, CARD_BORDER_STYLES, THEME_KEY_TO_SCHEME } from '@/hooks/useShop';
import { useColorScheme } from '@/contexts/ThemeContext';
import type { ShopItem } from '@/types/shop';

// ─── Item card ───────────────────────────────────────────────────────────────

function ShopItemCard({
  item,
  owned,
  isEquipped,
  spendableXp,
  onBuy,
  onEquip,
}: {
  item: ShopItem;
  owned: boolean;
  isEquipped: boolean;
  spendableXp: number;
  onBuy: () => void;
  onEquip: () => void;
}) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const canAfford = spendableXp >= item.price;

  return (
    <Paper
      elevation={0}
      sx={{
        background: isEquipped
          ? alpha(brand[100], 0.8)
          : alpha(brand[50], 0.6),
        border: isEquipped
          ? `2px solid ${brand[400]}`
          : `1px solid ${alpha(brand[300], 0.40)}`,
        borderRadius: 4,
        p: 2.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        transition: 'all 0.2s ease',
        '&:hover': { boxShadow: `0 4px 20px ${alpha(brand[700], 0.12)}` },
      }}
    >
      {/* Preview swatch */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 3,
            background: item.preview === 'none' ? alpha(brand[200], 0.5) : item.preview,
            border: `1px solid ${alpha(brand[300], 0.4)}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            flexShrink: 0,
          }}
        >
          {item.emoji}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontFamily: '"DM Serif Display", serif',
              fontSize: '0.95rem',
              color: brand[700],
              lineHeight: 1.2,
            }}
          >
            {item.name}
          </Typography>
          <Typography
            sx={{ fontSize: '0.72rem', color: 'text.secondary', lineHeight: 1.3, mt: 0.25 }}
          >
            {item.description}
          </Typography>
        </Box>
      </Box>

      {/* Action row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {isEquipped ? (
          <Chip
            icon={<CheckCircleIcon sx={{ fontSize: '0.85rem !important' }} />}
            label="Equipped"
            size="small"
            sx={{
              bgcolor: alpha(brand[400], 0.18),
              color: brand[700],
              fontWeight: 700,
              fontSize: '0.68rem',
              height: 26,
              border: `1px solid ${alpha(brand[400], 0.4)}`,
            }}
          />
        ) : owned ? (
          <Button
            onClick={onEquip}
            size="small"
            variant="outlined"
            sx={{
              fontSize: '0.72rem',
              px: 1.5,
              py: 0.3,
              borderRadius: 6,
            }}
          >
            Equip
          </Button>
        ) : item.price === 0 ? (
          <Chip
            label="Free"
            size="small"
            sx={{
              bgcolor: alpha('#34D399', 0.15),
              color: '#059669',
              fontWeight: 700,
              fontSize: '0.68rem',
              height: 26,
              border: '1px solid rgba(52, 211, 153, 0.4)',
            }}
          />
        ) : (
          <Tooltip
            title={canAfford ? '' : `Need ${(item.price - spendableXp).toLocaleString()} more XP`}
            arrow
          >
            <span>
              <Button
                onClick={onBuy}
                disabled={!canAfford}
                size="small"
                variant="contained"
                sx={{ fontSize: '0.72rem', px: 1.5, py: 0.3, borderRadius: 6 }}
              >
                <AutoAwesomeIcon sx={{ fontSize: '0.8rem', mr: 0.5 }} />
                {item.price.toLocaleString()} XP
              </Button>
            </span>
          </Tooltip>
        )}

        {owned && !isEquipped && item.price > 0 && (
          <Chip
            label="Owned"
            size="small"
            sx={{
              bgcolor: alpha(brand[300], 0.18),
              color: brand[600],
              fontWeight: 700,
              fontSize: '0.62rem',
              height: 22,
              border: `1px solid ${alpha(brand[300], 0.4)}`,
            }}
          />
        )}

        {!owned && item.price > 0 && !canAfford && (
          <LockIcon sx={{ fontSize: '0.9rem', color: alpha(brand[400], 0.5), ml: 'auto' }} />
        )}
      </Box>
    </Paper>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function Shop() {
  const theme = useTheme();
  const { brand } = theme.palette;
  const { progress, spendableXp, loading: progressLoading, refetch: refetchProgress } = useProgress();
  const {
    equipped,
    loading: shopLoading,
    error: shopError,
    ownsItem,
    purchaseItem,
    equipItem,
    refetch: refetchShop,
  } = useShop();
  const { setScheme } = useColorScheme();

  const [tab, setTab] = useState(0);
  const [confirmItem, setConfirmItem] = useState<ShopItem | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loading = progressLoading || shopLoading;
  const themes = SHOP_ITEMS.filter((i) => i.category === 'theme');
  const borders = SHOP_ITEMS.filter((i) => i.category === 'card_border');
  const items = tab === 0 ? themes : borders;

  const handleBuy = async () => {
    if (!confirmItem) return;
    setPurchasing(true);
    setErrorMsg(null);

    const { error } = await purchaseItem(confirmItem.key, spendableXp);

    if (error) {
      setErrorMsg(error);
    } else {
      setSuccessMsg(`${confirmItem.emoji} ${confirmItem.name} purchased!`);
      // Auto-apply theme if it's a theme purchase
      const scheme = THEME_KEY_TO_SCHEME[confirmItem.key];
      if (scheme) {
        setScheme(scheme as Parameters<typeof setScheme>[0]);
      }
      await refetchProgress();
      setTimeout(() => setSuccessMsg(null), 3000);
    }

    setPurchasing(false);
    setConfirmItem(null);
  };

  const handleEquip = async (item: ShopItem) => {
    const { error } = await equipItem(item.key);
    if (error) {
      setErrorMsg(error);
    } else {
      // Apply theme if equipping a theme
      const scheme = THEME_KEY_TO_SCHEME[item.key];
      if (scheme) {
        setScheme(scheme as Parameters<typeof setScheme>[0]);
      }
    }
  };

  return (
    <Box
      sx={{
        maxWidth: 860,
        mx: 'auto',
        px: { xs: 2, sm: 4 },
        py: 4,
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      {/* ── Header ── */}
      <Box>
        <Typography
          sx={{
            fontFamily: '"DM Serif Display", serif',
            fontSize: { xs: '1.6rem', sm: '2rem' },
            color: brand[700],
            lineHeight: 1.1,
          }}
        >
          <StorefrontIcon sx={{ fontSize: '1.6rem', mr: 1, verticalAlign: 'text-bottom' }} />
          Shop
        </Typography>
        <Typography sx={{ fontSize: '0.88rem', color: 'text.secondary', mt: 0.5 }}>
          Spend your hard-earned XP on themes and card borders!
        </Typography>
      </Box>

      {/* ── XP Wallet ── */}
      {loading ? (
        <Skeleton variant="rounded" height={80} sx={{ borderRadius: 4 }} />
      ) : progress ? (
        <Paper
          elevation={0}
          sx={{
            background: `linear-gradient(135deg, ${alpha(brand[100], 0.8)} 0%, ${alpha(brand[200], 0.5)} 100%)`,
            border: `1px solid ${alpha(brand[300], 0.40)}`,
            borderRadius: 4,
            p: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box>
            <Typography
              sx={{ fontFamily: '"DM Serif Display", serif', fontSize: '0.78rem', color: 'text.secondary' }}
            >
              Spendable XP
            </Typography>
            <Typography
              sx={{
                fontFamily: '"DM Serif Display", serif',
                fontSize: '2.2rem',
                color: brand[700],
                lineHeight: 1.1,
              }}
            >
              <AutoAwesomeIcon sx={{ fontSize: '1.4rem', mr: 0.5, verticalAlign: 'text-bottom' }} />
              {spendableXp.toLocaleString()}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
              Total earned: {progress.total_xp.toLocaleString()} XP
            </Typography>
            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
              Level {progress.level}
            </Typography>
          </Box>
        </Paper>
      ) : null}

      {/* ── Alerts ── */}
      {successMsg && (
        <Alert severity="success" onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}
      {(errorMsg || shopError) && (
        <Alert severity="error" onClose={() => setErrorMsg(null)}>
          {errorMsg || shopError}
        </Alert>
      )}

      {/* ── Tabs ── */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          '& .MuiTab-root': {
            fontFamily: '"DM Serif Display", serif',
            textTransform: 'none',
            fontSize: '0.95rem',
            color: brand[500],
            '&.Mui-selected': { color: brand[700] },
          },
          '& .MuiTabs-indicator': {
            backgroundColor: brand[700],
            height: 3,
            borderRadius: 2,
          },
        }}
      >
        <Tab label="Themes" />
        <Tab label="Card Borders" />
      </Tabs>

      {/* ── Item grid ── */}
      {loading ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={120} sx={{ borderRadius: 4 }} />
          ))}
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          {items.map((item) => {
            const owned = ownsItem(item.key);
            const slot = item.category;
            const isEquipped = equipped[slot] === item.key
              // Default items are "equipped" if no other item is equipped in that slot
              || (item.price === 0 && !equipped[slot] && item.key === (slot === 'theme' ? 'theme_sakura' : 'border_none'));

            return (
              <ShopItemCard
                key={item.key}
                item={item}
                owned={owned}
                isEquipped={isEquipped}
                spendableXp={spendableXp}
                onBuy={() => setConfirmItem(item)}
                onEquip={() => handleEquip(item)}
              />
            );
          })}
        </Box>
      )}

      {/* ── Purchase confirmation dialog ── */}
      <Dialog
        open={!!confirmItem}
        onClose={() => { if (!purchasing) setConfirmItem(null); }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 4,
              border: `1px solid ${alpha(brand[300], 0.35)}`,
              boxShadow: `0 8px 40px ${alpha(brand[700], 0.12)}`,
              bgcolor: theme.palette.surfaces.overlay,
              minWidth: 340,
            },
          },
        }}
      >
        {confirmItem && (
          <>
            <DialogTitle
              sx={{ fontFamily: '"DM Serif Display", serif', color: brand[700], pb: 0.5 }}
            >
              {confirmItem.emoji} Buy {confirmItem.name}?
            </DialogTitle>
            <DialogContent>
              <Typography sx={{ fontSize: '0.88rem', color: 'text.secondary', mb: 2 }}>
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
                  border: `1px solid ${alpha(brand[300], 0.3)}`,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>Cost</Typography>
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: brand[700] }}>
                    {confirmItem.price.toLocaleString()} XP
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>Current balance</Typography>
                  <Typography sx={{ fontSize: '0.82rem', color: 'text.primary' }}>
                    {spendableXp.toLocaleString()} XP
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    pt: 0.75,
                    borderTop: `1px solid ${alpha(brand[300], 0.3)}`,
                  }}
                >
                  <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>After purchase</Typography>
                  <Typography
                    sx={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: spendableXp - confirmItem.price >= 0 ? '#059669' : '#DC2626',
                    }}
                  >
                    {(spendableXp - confirmItem.price).toLocaleString()} XP
                  </Typography>
                </Box>
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
              <Button
                onClick={() => setConfirmItem(null)}
                disabled={purchasing}
                sx={{ color: 'text.secondary', textTransform: 'none', borderRadius: 6 }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBuy}
                disabled={purchasing || spendableXp < confirmItem.price}
                variant="contained"
                sx={{
                  textTransform: 'none',
                  borderRadius: 6,
                  fontFamily: '"DM Serif Display", serif',
                }}
              >
                {purchasing ? 'Purchasing...' : `Spend ${confirmItem.price.toLocaleString()} XP`}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}

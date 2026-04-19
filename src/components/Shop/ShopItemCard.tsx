'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import { useTheme, alpha } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { CUTE_FONT } from '@/theme';
import type { ShopItem } from '@/types/shop';
import { THEME_COLORS } from './constants';
import { ThemeCardPreview } from './ThemeCardPreview';
import { BorderCardPreview } from './BorderCardPreview';
import { BuddyCardPreview } from './BuddyCardPreview';

export function ShopItemCard({
  item,
  owned,
  isEquipped,
  spendableXp,
  onBuy,
  onEquip,
  onPreview,
  mini,
}: {
  item: ShopItem;
  owned: boolean;
  isEquipped: boolean;
  spendableXp: number;
  onBuy: () => void;
  onEquip: () => void;
  onPreview: () => void;
  mini?: boolean;
}) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const canAfford = spendableXp >= item.price;
  const isTheme = item.category === 'theme';
  const isCelebration = item.category === 'celebration';
  const isBuddy = item.category === 'study_buddy';

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
      {isEquipped && (
        <Box
          sx={{
            position: 'absolute',
            top: mini ? -6 : -8,
            right: mini ? -6 : -8,
            bgcolor: '#fff',
            borderRadius: '50%',
            width: mini ? 20 : 26,
            height: mini ? 20 : 26,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 2px 8px ${alpha(brand[400], 0.3)}`,
            zIndex: 2,
          }}
        >
          <CheckCircleIcon sx={{ fontSize: mini ? '0.85rem' : '1.1rem', color: brand[500] }} />
        </Box>
      )}
      {/* Preview area */}
      <Box
        sx={{
          position: 'relative',
          height: mini ? { xs: 60, sm: 70 } : { xs: 100, sm: 120 },
          background: isTheme
            ? `linear-gradient(135deg, ${alpha(THEME_COLORS[item.key]?.bg || brand[50], 0.8)}, ${alpha(THEME_COLORS[item.key]?.brand || brand[200], 0.15)})`
            : `linear-gradient(135deg, ${alpha(brand[100], 0.5)}, ${alpha(brand[200], 0.3)})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {mini && (isTheme || (!isCelebration && !isBuddy)) ? (
          <Box sx={{ transform: 'scale(0.65)', transformOrigin: 'center', width: '100%', height: '100%' }}>
            {isTheme ? <ThemeCardPreview themeKey={item.key} /> : <BorderCardPreview borderKey={item.key} />}
          </Box>
        ) : isTheme ? (
          <ThemeCardPreview themeKey={item.key} />
        ) : isCelebration ? (
          <Typography sx={{ fontSize: mini ? '1.8rem' : '3rem', lineHeight: 1 }}>{item.emoji}</Typography>
        ) : isBuddy ? (
          <BuddyCardPreview buddyKey={item.key} />
        ) : (
          <BorderCardPreview borderKey={item.key} />
        )}

        {!owned && !canAfford && item.price > 0 && !mini && (
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

        {!mini && (
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
        )}
      </Box>

      {/* Info + action area */}
      <Box sx={{ p: mini ? { xs: 0.75, sm: 1 } : { xs: 1.25, sm: 1.5 }, display: 'flex', flexDirection: 'column', gap: mini ? 0.25 : 0.75, flex: 1 }}>
        <Typography
          sx={{
            fontFamily: CUTE_FONT,
            fontSize: mini ? { xs: '0.72rem', sm: '0.78rem' } : { xs: '0.82rem', sm: '0.92rem' },
            color: brand[700],
            lineHeight: 1.2,
          }}
        >
          {item.name}
        </Typography>
        {!mini && (
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
        )}

        {/* Price + action row */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.5, mt: 'auto', pt: mini ? 0 : 0.5 }}>
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

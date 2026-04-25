'use client';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

interface PageHeaderProps {
  title: React.ReactNode;
  emoji?: string;
  subtitle?: string;
  description?: string;
  onBack?: () => void;
  action?: React.ReactNode;
  badge?: string;
  /** Extra content rendered below the title row (e.g. chips, XP bar) */
  children?: React.ReactNode;
  /** Right-side content rendered opposite the title (e.g. Shop XP box) */
  endContent?: React.ReactNode;
  /** Use gradient text for the title */
  gradientTitle?: boolean;
  /** Bottom margin override (default 4 = 32px) */
  mb?: number;
  /** Compact mode for in-page section headers */
  compact?: boolean;
}

export function PageHeader({
  title,
  emoji,
  subtitle,
  description,
  onBack,
  action,
  badge,
  children,
  endContent,
  gradientTitle,
  mb = 4,
  compact,
}: PageHeaderProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;

  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: compact ? 3 : 4,
        mb,
        p: compact ? { xs: 2, sm: 2.5 } : { xs: 3, sm: 3.5 },
        background: `linear-gradient(135deg, ${brand[200]} 0%, ${accent[100]} 45%, ${brand[100]} 100%)`,
        border: `2px solid ${alpha(brand[300], 0.45)}`,
        boxShadow: `0 6px 24px ${alpha(brand[300], 0.22)}`,
      }}
    >
      {/* Decorative blobs — clipped to border radius */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          borderRadius: 'inherit',
          pointerEvents: 'none',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 160,
            height: 160,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(brand[300], 0.35)} 0%, transparent 70%)`,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -25,
            left: '35%',
            width: 110,
            height: 110,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(accent[300], 0.3)} 0%, transparent 70%)`,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            top: '10%',
            left: -20,
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha(accent[200], 0.25)} 0%, transparent 70%)`,
          }}
        />
      </Box>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
      >
        <Box sx={{ position: 'relative', zIndex: 1, minWidth: 0 }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={compact ? 1 : 1.5}
            mb={children ? 0.5 : 0}
          >
            {onBack && (
              <IconButton
                onClick={onBack}
                size="small"
                sx={{
                  border: `1.5px solid ${alpha(brand[400], 0.5)}`,
                  borderRadius: '9px',
                  width: 32,
                  height: 32,
                  flexShrink: 0,
                  color: brand[700],
                  bgcolor: alpha('#FFFFFF', 0.5),
                  '&:hover': { bgcolor: alpha('#FFFFFF', 0.8), borderColor: brand[500] },
                }}
              >
                <ArrowBackIcon sx={{ fontSize: 15 }} />
              </IconButton>
            )}
            {emoji && (
              <Typography
                sx={{
                  fontSize: compact ? { xs: '1.4rem', sm: '1.6rem' } : { xs: '1.6rem', sm: '2rem' },
                  flexShrink: 0,
                }}
              >
                {emoji}
              </Typography>
            )}
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant={compact ? 'h5' : 'h4'}
                sx={{
                  fontWeight: 800,
                  lineHeight: 1.1,
                  ...(gradientTitle
                    ? {
                        background: `linear-gradient(90deg, ${brand[700]} 0%, ${accent[500]} 100%)`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }
                    : { color: brand[800] }),
                }}
              >
                {title}
              </Typography>
              {subtitle && (
                <Typography variant="body2" sx={{ color: brand[600], mt: 0.25 }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
            {badge && (
              <Chip
                label={badge}
                size="small"
                sx={{
                  borderRadius: '8px',
                  bgcolor: alpha(brand[100], 0.9),
                  border: `1.5px solid ${alpha(brand[400], 0.4)}`,
                  color: brand[700],
                  fontWeight: 800,
                  fontSize: '0.7rem',
                  flexShrink: 0,
                }}
              />
            )}
          </Stack>
          {description && (
            <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 420 }}>
              {description}
            </Typography>
          )}
          {children}
        </Box>

        {(action || endContent) && (
          <Box sx={{ flexShrink: 0, position: 'relative', zIndex: 1 }}>{endContent ?? action}</Box>
        )}
      </Stack>
    </Box>
  );
}

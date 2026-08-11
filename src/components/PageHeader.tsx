'use client';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

interface PageHeaderProps {
  title: React.ReactNode;
  /** Leading icon — pass an MUI icon element (e.g. <CardGiftcardIcon />) */
  icon?: React.ReactNode;
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
  /** Bottom margin override (default 4 = 32px). */
  mb?: number | Partial<Record<'xs' | 'sm' | 'md' | 'lg', number>>;
  /** Compact mode for in-page section headers */
  compact?: boolean;
}

export function PageHeader({
  title,
  icon,
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
  const t = useTranslations('Common');
  const theme = useTheme();
  const { brand, accent } = theme.palette;

  return (
    <Box sx={{ mb }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
        spacing={2}
      >
        <Box sx={{ minWidth: 0 }}>
          <Stack
            direction="row"
            alignItems="flex-start"
            spacing={compact ? 1 : 1.5}
            mb={children ? 0.5 : 0}
          >
            {onBack && (
              <IconButton
                aria-label={t('back')}
                onClick={onBack}
                size="small"
                sx={{
                  border: `1.5px solid ${alpha(brand[300], 0.45)}`,
                  borderRadius: '9px',
                  width: 32,
                  height: 32,
                  flexShrink: 0,
                  color: brand[600],
                  bgcolor: alpha(brand[50], 0.6),
                  '&:hover': { bgcolor: alpha(brand[100], 0.8), borderColor: brand[400] },
                }}
              >
                <ArrowBackIcon sx={{ fontSize: 15 }} />
              </IconButton>
            )}
            {icon && (
              <Box
                sx={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: brand[500],
                  '& .MuiSvgIcon-root': {
                    fontSize: compact
                      ? { xs: '1.6rem', sm: '1.8rem' }
                      : { xs: '2rem', sm: '2.4rem' },
                  },
                }}
              >
                {icon}
              </Box>
            )}
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant={compact ? 'h5' : 'h4'}
                sx={{
                  fontWeight: 800,
                  lineHeight: 1.1,
                  fontSize: compact
                    ? { xs: '1.3rem', sm: '1.5rem' }
                    : { xs: '1.65rem', sm: '2.125rem' },
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
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25, ml: '3px' }}>
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
                  bgcolor: alpha(brand[100], 0.7),
                  border: `1.5px solid ${alpha(brand[300], 0.35)}`,
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

        {(action || endContent) && <Box sx={{ flexShrink: 0 }}>{endContent ?? action}</Box>}
      </Stack>

      {/* Whisper accent line — hidden in compact mode */}
      {!compact && (
        <Box
          sx={{
            height: '1.5px',
            mt: { xs: '14px', sm: '22px' },
            background: `linear-gradient(90deg, transparent 0%, ${brand[400]} 10%, ${accent[400]} 90%, transparent 100%)`,
          }}
        />
      )}
    </Box>
  );
}

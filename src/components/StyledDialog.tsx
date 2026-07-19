'use client';
import CloseIcon from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import { alpha, type SxProps, type Theme, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';
import { type ReactNode } from 'react';

interface StyledDialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md';
  closeDisabled?: boolean;
  actions?: ReactNode;
  actionsJustify?: 'flex-end' | 'space-between' | 'center';
  paperSx?: SxProps<Theme>;
  contentSx?: SxProps<Theme>;
  /** Unique id for aria-labelledby. Falls back to auto-generated id. */
  titleId?: string;
}

export function StyledDialog({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  maxWidth = 'xs',
  closeDisabled = false,
  actions,
  actionsJustify = 'flex-end',
  paperSx,
  contentSx,
  titleId: titleIdProp,
}: StyledDialogProps) {
  const t = useTranslations('Common');
  const { palette } = useTheme();
  const { brand, accent } = palette;
  const titleId = titleIdProp ?? 'styled-dialog-title';

  return (
    <Dialog
      open={open}
      onClose={closeDisabled ? undefined : onClose}
      maxWidth={maxWidth}
      fullWidth
      aria-labelledby={titleId}
      slotProps={{
        paper: {
          sx: {
            bgcolor: brand[50],
            backgroundImage: 'none',
            border: `1.5px solid ${alpha(brand[300], 0.4)}`,
            boxShadow: `0 20px 60px ${alpha(brand[500], 0.14)}, 0 4px 16px ${alpha(brand[300], 0.2)}`,
            borderRadius: (theme) => theme.radii.lg,
            overflow: 'hidden',
            ...((paperSx ?? {}) as Record<string, unknown>),
          },
        },
      }}
    >
      <Box
        sx={{
          background: `linear-gradient(135deg, ${alpha(brand[100], 0.5)} 0%, ${alpha(accent[100], 0.5)} 100%)`,
          borderBottom: `1.5px solid ${alpha(brand[300], 0.25)}`,
          px: 3,
          pt: 2.5,
          pb: 2,
          position: 'relative',
        }}
      >
        <IconButton
          size="small"
          onClick={onClose}
          disabled={closeDisabled}
          aria-label={t('close')}
          sx={{
            position: 'absolute',
            top: 14,
            right: 14,
            width: 28,
            height: 28,
            color: alpha(brand[700], 0.4),
            '&:hover': { bgcolor: alpha(brand[300], 0.2), color: brand[700] },
            '&.Mui-disabled': { opacity: 0.25 },
          }}
        >
          <CloseIcon sx={{ fontSize: 15 }} />
        </IconButton>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {icon}
          <Typography
            id={titleId}
            sx={{
              fontSize: '1.15rem',
              fontWeight: 900,
              color: brand[800],
              lineHeight: 1.2,
              mb: subtitle ? 0.4 : 0,
            }}
          >
            {title}
          </Typography>
        </Box>
        {subtitle && (
          <Typography
            sx={{
              fontSize: '0.75rem',
              color: alpha(brand[700], 0.6),
              fontWeight: 600,
              ml: icon ? 4.5 : 0,
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>

      <DialogContent
        sx={{
          px: 2.5,
          pt: 2.5,
          pb: actions ? 1 : 2.5,
          ...((contentSx ?? {}) as Record<string, unknown>),
        }}
      >
        {children}
      </DialogContent>

      {actions && (
        <Box sx={{ display: 'flex', justifyContent: actionsJustify, px: 3, pb: 2.5, pt: 0.5 }}>
          {actions}
        </Box>
      )}
    </Dialog>
  );
}

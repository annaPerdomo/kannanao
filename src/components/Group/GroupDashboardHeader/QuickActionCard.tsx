'use client';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useCallback } from 'react';

interface QuickActionCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  badge?: number;
}

export function QuickActionCard({ icon, title, subtitle, onClick, badge }: QuickActionCardProps) {
  const theme = useTheme();
  const { brand } = theme.palette;

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    },
    [onClick],
  );

  return (
    <Paper
      elevation={0}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={onKeyDown}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        px: 1.5,
        py: 1,
        width: { xs: '100%', sm: 'auto' },
        cursor: 'pointer',
        borderRadius: theme.radii.md,
        border: `1.5px solid ${alpha(brand[300], 0.45)}`,
        bgcolor: alpha(brand[50], 0.5),
        transition: 'background-color 0.15s ease, border-color 0.15s ease',
        '&:hover': { bgcolor: alpha(brand[100], 0.7), borderColor: brand[400] },
        '&:focus-visible': { outline: `2px solid ${brand[500]}`, outlineOffset: 2 },
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: theme.radii.sm,
          bgcolor: alpha(brand[200], 0.6),
          color: brand[700],
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography
            sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'text.primary', lineHeight: 1.2 }}
          >
            {title}
          </Typography>
          {badge !== undefined && badge > 0 && (
            <Box
              component="span"
              sx={{
                px: 0.75,
                borderRadius: theme.radii.pill,
                bgcolor: alpha(brand[200], 0.7),
                fontSize: '0.68rem',
                fontWeight: 800,
                color: brand[800],
              }}
            >
              {badge}
            </Box>
          )}
        </Box>
        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', lineHeight: 1.2 }}>
          {subtitle}
        </Typography>
      </Box>
    </Paper>
  );
}

'use client';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

interface ReorderBannerProps {
  label?: string;
}

export function ReorderBanner({
  label = 'Drag and drop to reorder. Click Done when finished.',
}: ReorderBannerProps) {
  const theme = useTheme();
  const { accent } = theme.palette;

  return (
    <Box
      sx={{
        mb: 2,
        px: 2,
        py: 1,
        borderRadius: 2,
        bgcolor: alpha(accent[100], 0.5),
        border: `1px solid ${alpha(accent[300], 0.4)}`,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
      }}
    >
      <SwapVertIcon sx={{ fontSize: '1rem', color: accent[500] }} />
      <Typography sx={{ fontSize: '0.8rem', color: accent[700], fontWeight: 600 }}>
        {label}
      </Typography>
    </Box>
  );
}

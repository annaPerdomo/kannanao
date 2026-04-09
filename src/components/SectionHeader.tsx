'use client';
import { Box, Typography, IconButton, Chip } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import { alpha } from '@mui/material/styles';

interface SectionHeaderProps {
  title: string;
  onBack: () => void;
  badge?: string;
}

export function SectionHeader({ title, onBack, badge }: SectionHeaderProps) {
  return (
    <Box
      sx={(theme) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        mb: 4,
        p: 3,
        borderRadius: 3,
        bgcolor: theme.palette.surfaces.input,
        border: `1px solid ${alpha(theme.palette.brand[300], 0.45)}`,
        boxShadow: `0 12px 28px ${alpha(theme.palette.brand[300], 0.12)}`,
      })}
    >
      <IconButton onClick={onBack} size="small" sx={{ color: 'primary.dark' }}>
        <ArrowBackIosNewIcon fontSize="small" />
      </IconButton>
      <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 700, color: 'primary.dark' }}>
        {title}
      </Typography>
      {badge && <Chip label={badge} size="small" />}
    </Box>
  );
}

'use client';
import { Box, Typography, IconButton, Chip } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';

interface SectionHeaderProps {
  title: string;
  onBack: () => void;
  badge?: string;
}

export function SectionHeader({ title, onBack, badge }: SectionHeaderProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        mb: 4,
        p: 3,
        borderRadius: 3,
        bgcolor: '#FFF2F8',
        border: '1px solid rgba(249,168,212,0.45)',
        boxShadow: '0 12px 28px rgba(249,168,212,0.12)',
      }}
    >
      <IconButton onClick={onBack} size="small" sx={{ color: '#BE185D' }}>
        <ArrowBackIosNewIcon fontSize="small" />
      </IconButton>
      <Typography variant="h5" sx={{ flexGrow: 1, fontWeight: 700, color: '#BE185D' }}>
        {title}
      </Typography>
      {badge && <Chip label={badge} size="small" />}
    </Box>
  );
}
'use client';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';

interface ShowMoreButtonProps {
  expanded: boolean;
  /** Full item count, shown in the collapsed label. */
  total: number;
  onClick: () => void;
}

export function ShowMoreButton({ expanded, total, onClick }: ShowMoreButtonProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const t = useTranslations('Group.groupPage');

  return (
    <Box sx={{ mt: 1.5, pt: 1.5, borderTop: `1px solid ${alpha(brand[300], 0.3)}` }}>
      <Button
        fullWidth
        size="small"
        variant="text"
        onClick={onClick}
        sx={{
          textTransform: 'none',
          fontWeight: 700,
          fontSize: '0.8rem',
          color: brand[700],
          borderRadius: theme.radii.sm,
        }}
      >
        {expanded ? t('showLess') : t('showAll', { count: total })}
      </Button>
    </Box>
  );
}

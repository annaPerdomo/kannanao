import { alpha, type Theme } from '@mui/material/styles';

export const compactToggleSx = (theme: Theme) =>
  ({
    '& .MuiToggleButton-root': {
      px: 0.8,
      py: 0.25,
      fontSize: '0.65rem',
      fontWeight: 800,
      lineHeight: 1,
      minWidth: 0,
      border: `1px solid ${alpha(theme.palette.brand[300], 0.4)}`,
      color: alpha(theme.palette.brand[700], 0.6),
      '&.Mui-selected': {
        bgcolor: alpha(theme.palette.brand[300], 0.2),
        color: theme.palette.brand[700],
        borderColor: alpha(theme.palette.brand[500], 0.5),
      },
      '&:hover:not(.Mui-selected)': {
        bgcolor: alpha(theme.palette.brand[300], 0.06),
      },
    },
  }) as const;

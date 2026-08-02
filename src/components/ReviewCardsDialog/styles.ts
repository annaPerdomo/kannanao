import { alpha, type Theme } from '@mui/material/styles';

/**
 * The header's copy applies to every card in the batch, so it is sized to be
 * read and hit rather than tucked away like the per-row version below.
 */
export const prominentToggleSx = (theme: Theme) =>
  ({
    '& .MuiToggleButton-root': {
      px: 1.6,
      py: 0.7,
      fontSize: '0.82rem',
      fontWeight: 800,
      lineHeight: 1.1,
      minWidth: 0,
      borderRadius: '10px !important',
      border: `1.5px solid ${alpha(theme.palette.brand[300], 0.55)} !important`,
      color: theme.palette.text.secondary,
      bgcolor: '#fff',
      '&.Mui-selected': {
        bgcolor: theme.palette.brand[600],
        color: '#fff',
        borderColor: `${theme.palette.brand[700]} !important`,
        boxShadow: `0 2px 8px ${alpha(theme.palette.brand[600], 0.35)}`,
        '&:hover': { bgcolor: theme.palette.brand[700] },
      },
      '&:hover:not(.Mui-selected)': {
        bgcolor: alpha(theme.palette.brand[300], 0.16),
      },
    },
  }) as const;

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

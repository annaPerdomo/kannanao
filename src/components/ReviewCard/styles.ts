import { alpha, type Theme } from '@mui/material/styles';

import { SUMMARY_THUMBNAIL_SIZE } from './constants';

export const rowContainerSx = (theme: Theme) =>
  ({
    border: `1.5px solid ${alpha(theme.palette.brand[300], 0.3)}`,
    borderRadius: '14px',
    bgcolor: theme.palette.brand[50],
    overflow: 'hidden',
    flexShrink: 0,
  }) as const;

export const summaryRowSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1.5,
  px: 1.5,
  py: 1.25,
  minHeight: 62,
  cursor: 'pointer',
  userSelect: 'none',
} as const;

export const thumbnailSx = (theme: Theme) =>
  ({
    width: SUMMARY_THUMBNAIL_SIZE,
    height: SUMMARY_THUMBNAIL_SIZE,
    borderRadius: '10px',
    flexShrink: 0,
    overflow: 'hidden',
    bgcolor: theme.palette.action.disabledBackground,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }) as const;

'use client';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import { alpha, useTheme } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';

export interface RowPin {
  pinned: boolean;
  onToggle: () => void;
  /** Accessible name and tooltip while unpinned — i.e. what clicking will do. */
  pinLabel: string;
  /** …and while pinned. */
  unpinLabel: string;
}

interface PinnableRowProps {
  onOpen: () => void;
  ariaLabel: string;
  /** Omit for a row that cannot be pinned. */
  pin?: RowPin;
  /** Border colour on hover — a speech row reads purple where a group reads pink. */
  hoverBorderColor?: string;
  children: React.ReactNode;
}

/**
 * The white row the dashboard's list sections are built from: one big open
 * target, with an optional pin toggle in its top-right corner.
 *
 * The pin is a sibling of the open target, not a child of it — a button inside
 * a button is invalid HTML, and browsers silently drop the inner control.
 */
export function PinnableRow({
  onOpen,
  ariaLabel,
  pin,
  hoverBorderColor,
  children,
}: PinnableRowProps) {
  const theme = useTheme();
  const { brand } = theme.palette;

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        borderRadius: (th) => th.radii.lg,
        border: `1.5px solid ${alpha(brand[300], 0.3)}`,
        bgcolor: 'background.paper',
        boxShadow: `0 10px 30px ${alpha(brand[400], 0.1)}`,
        transition: 'transform 0.12s ease, border-color 0.12s ease',
        '&:hover': {
          transform: 'translateY(-1px)',
          borderColor: hoverBorderColor ?? brand[400],
        },
      }}
    >
      <ButtonBase
        onClick={onOpen}
        focusRipple
        aria-label={ariaLabel}
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          alignItems: 'stretch',
          gap: 1.5,
          textAlign: 'left',
          p: 2.25,
          borderRadius: (th) => th.radii.lg,
        }}
      >
        {children}
      </ButtonBase>

      {pin && (
        <Tooltip title={pin.pinned ? pin.unpinLabel : pin.pinLabel}>
          <IconButton
            size="small"
            aria-label={pin.pinned ? pin.unpinLabel : pin.pinLabel}
            onClick={pin.onToggle}
            sx={{
              position: 'absolute',
              top: 6,
              right: 6,
              color: pin.pinned ? brand[600] : alpha(brand[400], 0.6),
              '&:hover': { color: brand[700], bgcolor: alpha(brand[100], 0.6) },
            }}
          >
            {pin.pinned ? (
              <PushPinIcon sx={{ fontSize: 16 }} />
            ) : (
              <PushPinOutlinedIcon sx={{ fontSize: 16 }} />
            )}
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}

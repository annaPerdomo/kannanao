'use client';
import { Box, Typography } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

interface AddCardOptionButtonsProps {
  disabled?: boolean;
  onAddExisting: () => void;
  onImportPdf: () => void;
}

export function OrDivider() {
  const { palette } = useTheme();
  const { brand } = palette;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
      <Box sx={{ flexGrow: 1, height: '1px', bgcolor: alpha(brand[300], 0.3) }} />
      <Typography
        sx={{
          fontSize: '0.65rem',
          fontWeight: 800,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: alpha(brand[700], 0.5),
        }}
      >
        or
      </Typography>
      <Box sx={{ flexGrow: 1, height: '1px', bgcolor: alpha(brand[300], 0.3) }} />
    </Box>
  );
}

export function AddCardOptionButtons({ disabled = false, onAddExisting, onImportPdf }: AddCardOptionButtonsProps) {
  const { palette } = useTheme();
  const { brand, accent } = palette;

  const buttonSx = {
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
    p: '12px 14px',
    border: `1.5px solid ${alpha(brand[300], 0.35)}`,
    borderRadius: '12px',
    bgcolor: '#FFFFFF',
    cursor: disabled ? 'default' : 'pointer',
    textAlign: 'left',
    width: '100%',
    transition: 'all 0.15s ease',
    opacity: disabled ? 0.45 : 1,
    '&:hover:not(:disabled)': {
      borderColor: brand[400],
      bgcolor: brand[50],
      boxShadow: `0 2px 10px ${alpha(brand[300], 0.2)}`,
    },
  } as const;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box
        component="button"
        onClick={!disabled ? onAddExisting : undefined}
        disabled={disabled}
        sx={buttonSx}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            bgcolor: alpha(brand[100], 0.8),
            border: `1px solid ${alpha(brand[400], 0.3)}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <LibraryAddIcon sx={{ fontSize: 17, color: brand[500] }} />
        </Box>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: '0.8rem',
              fontWeight: 800,
              color: brand[800],
              lineHeight: 1.2,
            }}
          >
            Add Existing Cards
          </Typography>
          <Typography
            sx={{
              fontSize: '0.68rem',
              color: alpha(brand[700], 0.6),
              fontWeight: 500,
              mt: 0.2,
            }}
          >
            Copy from your other decks
          </Typography>
        </Box>
        <ChevronRightIcon sx={{ fontSize: 16, color: alpha(brand[700], 0.4), flexShrink: 0 }} />
      </Box>

      <Box
        component="button"
        onClick={!disabled ? onImportPdf : undefined}
        disabled={disabled}
        sx={buttonSx}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            bgcolor: alpha(accent[100], 0.8),
            border: `1px solid ${alpha(accent[300], 0.45)}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <PictureAsPdfIcon sx={{ fontSize: 17, color: accent[500] }} />
        </Box>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontSize: '0.8rem',
              fontWeight: 800,
              color: brand[800],
              lineHeight: 1.2,
            }}
          >
            Import from PDF
          </Typography>
          <Typography
            sx={{
              fontSize: '0.68rem',
              color: alpha(brand[700], 0.6),
              fontWeight: 500,
              mt: 0.2,
            }}
          >
            Extract vocabulary from a document
          </Typography>
        </Box>
        <ChevronRightIcon sx={{ fontSize: 16, color: alpha(brand[700], 0.4), flexShrink: 0 }} />
      </Box>
    </Box>
  );
}

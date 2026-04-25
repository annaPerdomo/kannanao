'use client';

import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';

import { CARD_BORDER_STYLES } from '@/hooks/useShop';

export function BorderCardPreview({ borderKey }: { borderKey: string }) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  const borderStyle = CARD_BORDER_STYLES[borderKey] || {};
  const hasBorder = borderKey !== 'border_none' && Object.keys(borderStyle).length > 0;

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 1,
      }}
    >
      <Box
        sx={{
          width: '80%',
          maxWidth: 120,
          bgcolor: brand[50],
          borderRadius: '8px',
          overflow: 'visible',
          border: hasBorder ? borderStyle.border : `1.5px solid ${alpha(brand[300], 0.3)}`,
          boxShadow: hasBorder ? borderStyle.boxShadow : `0 2px 8px ${alpha(brand[300], 0.15)}`,
          ...(borderStyle.background ? { background: borderStyle.background } : {}),
        }}
      >
        <Box
          sx={{
            bgcolor: brand[50],
            borderRadius: hasBorder ? '6px' : '7px',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              height: 10,
              background: `linear-gradient(135deg, ${brand[400]}, ${accent[400]})`,
            }}
          />
          <Box
            sx={{
              mx: '4px',
              mt: '3px',
              height: 32,
              borderRadius: '3px',
              background: `linear-gradient(135deg, ${alpha(brand[100], 0.8)}, ${alpha(accent[100], 0.5)})`,
              border: `1px solid ${alpha(brand[300], 0.15)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box
              sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: alpha(brand[300], 0.3) }}
            />
          </Box>
          <Box sx={{ px: '5px', py: '3px' }}>
            <Box sx={{ height: 5, width: '55%', bgcolor: alpha('#000', 0.5), borderRadius: 1 }} />
            <Box
              sx={{
                height: 3,
                width: '75%',
                bgcolor: alpha('#000', 0.15),
                borderRadius: 1,
                mt: '2px',
              }}
            />
          </Box>
          <Box
            sx={{
              mx: '4px',
              mb: '4px',
              p: '3px',
              bgcolor: alpha(brand[50], 0.8),
              borderRadius: '3px',
              border: `1px solid ${alpha(brand[300], 0.1)}`,
            }}
          >
            <Box
              sx={{ height: 3, width: '45%', bgcolor: alpha(brand[400], 0.4), borderRadius: 1 }}
            />
            <Box
              sx={{
                height: 3,
                width: '65%',
                bgcolor: alpha('#000', 0.1),
                borderRadius: 1,
                mt: '2px',
              }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

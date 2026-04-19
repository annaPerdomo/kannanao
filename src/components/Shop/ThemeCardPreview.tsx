'use client';

import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import { THEME_COLORS } from './constants';

export function ThemeCardPreview({ themeKey }: { themeKey: string }) {
  const colors = THEME_COLORS[themeKey];
  if (!colors) return null;

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 1 }}>
      <Box
        sx={{
          width: '80%',
          maxWidth: 120,
          bgcolor: colors.bg,
          borderRadius: '6px',
          overflow: 'hidden',
          border: `1.5px solid ${alpha(colors.brand, 0.3)}`,
          boxShadow: `0 2px 8px ${alpha(colors.brand, 0.2)}`,
        }}
      >
        <Box sx={{ height: 10, background: `linear-gradient(135deg, ${colors.brand}, ${colors.accent})` }} />
        <Box sx={{
          mx: '4px', mt: '3px', height: 32, borderRadius: '3px',
          background: `linear-gradient(135deg, ${alpha(colors.brand, 0.15)}, ${alpha(colors.accent, 0.15)})`,
          border: `1px solid ${alpha(colors.brand, 0.15)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: alpha(colors.brand, 0.25) }} />
        </Box>
        <Box sx={{ px: '5px', py: '3px' }}>
          <Box sx={{ height: 5, width: '60%', bgcolor: alpha(colors.text, 0.6), borderRadius: 1 }} />
          <Box sx={{ height: 3, width: '80%', bgcolor: alpha(colors.text, 0.2), borderRadius: 1, mt: '2px' }} />
        </Box>
        <Box sx={{ mx: '4px', mb: '4px', p: '3px', bgcolor: alpha(colors.brand, 0.06), borderRadius: '3px', border: `1px solid ${alpha(colors.brand, 0.1)}` }}>
          <Box sx={{ height: 3, width: '50%', bgcolor: alpha(colors.brand, 0.4), borderRadius: 1 }} />
          <Box sx={{ height: 3, width: '70%', bgcolor: alpha(colors.text, 0.15), borderRadius: 1, mt: '2px' }} />
        </Box>
      </Box>
    </Box>
  );
}

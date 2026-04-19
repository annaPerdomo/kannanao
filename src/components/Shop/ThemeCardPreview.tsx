'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
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
          borderRadius: '8px',
          overflow: 'hidden',
          border: `1.5px solid ${alpha(colors.brand, 0.3)}`,
          boxShadow: `0 2px 8px ${alpha(colors.brand, 0.2)}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Image area with gradient */}
        <Box sx={{
          width: '100%',
          height: 28,
          background: `linear-gradient(135deg, ${alpha(colors.brand, 0.25)}, ${alpha(colors.accent, 0.25)})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Typography sx={{ fontSize: '1rem', lineHeight: 1, color: alpha(colors.text, 0.7) }}>
            桜
          </Typography>
        </Box>

        {/* Card content */}
        <Box sx={{ width: '100%', px: '6px', py: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <Box sx={{ height: 4, width: '40%', bgcolor: alpha(colors.text, 0.55), borderRadius: 1, alignSelf: 'center' }} />
          <Box sx={{ height: 3, width: '60%', bgcolor: alpha(colors.text, 0.2), borderRadius: 1, alignSelf: 'center' }} />
        </Box>

        {/* Bottom accent bar */}
        <Box sx={{
          width: '100%',
          height: 5,
          background: `linear-gradient(90deg, ${colors.brand}, ${colors.accent})`,
        }} />
      </Box>
    </Box>
  );
}

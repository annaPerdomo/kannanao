'use client';

import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

export function CategoryButton({
  icon,
  label,
  active,
  onClick,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': { transform: 'translateY(-2px)' },
      }}
    >
      <Box
        sx={{
          width: { xs: 56, sm: 72 },
          height: { xs: 56, sm: 72 },
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: active ? alpha(color, 0.2) : alpha(color, 0.08),
          border: active ? `2.5px solid ${color}` : `1.5px solid ${alpha(color, 0.3)}`,
          boxShadow: active ? `0 4px 16px ${alpha(color, 0.3)}` : 'none',
          transition: 'all 0.2s ease',
          '& .MuiSvgIcon-root': {
            fontSize: { xs: '1.5rem', sm: '2rem' },
            color: active ? color : alpha(color, 0.6),
          },
        }}
      >
        {icon}
      </Box>
      <Typography
        sx={{
          fontFamily: (t) => t.fonts.cute,
          fontSize: { xs: '0.65rem', sm: '0.75rem' },
          fontWeight: active ? 700 : 500,
          color: active ? color : 'text.secondary',
          letterSpacing: '0.02em',
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

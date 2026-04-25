'use client';

import Box from '@mui/material/Box';
import { alpha, keyframes } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { BUDDY_CONFIG } from '@/hooks/useShop';

const gentleBounce = keyframes`
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-6px) scale(1.05); }
`;

const wobbleFloat = keyframes`
  0%, 100% { transform: translateY(0) rotate(-2deg); }
  50% { transform: translateY(-4px) rotate(2deg); }
`;

const bubblePulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 0.9; }
  50% { transform: scale(1.05); opacity: 1; }
`;

const BUDDY_COLORS: Record<string, { bg: string; accent: string }> = {
  buddy_pink_cat: { bg: '#FFF0F5', accent: '#F472B6' },
  buddy_bunny: { bg: '#FFF5F5', accent: '#FDA4AF' },
  buddy_penguin: { bg: '#F0F9FF', accent: '#7DD3FC' },
  buddy_panda: { bg: '#F0FDF4', accent: '#86EFAC' },
  buddy_fox: { bg: '#FFFBEB', accent: '#FCD34D' },
};

export function BuddyCardPreview({ buddyKey }: { buddyKey: string }) {
  const config = BUDDY_CONFIG[buddyKey];
  const colors = BUDDY_COLORS[buddyKey] ?? { bg: '#FFF0F5', accent: '#F472B6' };

  if (!config) return null;

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: `radial-gradient(ellipse at 50% 80%, ${alpha(colors.accent, 0.15)} 0%, ${colors.bg} 70%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.5,
        overflow: 'hidden',
      }}
    >
      {/* Decorative dots */}
      {[...Array(6)].map((_, i) => (
        <Box
          key={i}
          sx={{
            position: 'absolute',
            width: 4 + (i % 3) * 2,
            height: 4 + (i % 3) * 2,
            borderRadius: '50%',
            bgcolor: alpha(colors.accent, 0.2 + (i % 3) * 0.1),
            top: `${15 + ((i * 13) % 70)}%`,
            left: `${10 + ((i * 17) % 80)}%`,
            animation: `${wobbleFloat} ${2 + i * 0.3}s ease-in-out infinite`,
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}

      {/* Speech bubble */}
      <Box
        sx={{
          position: 'relative',
          bgcolor: alpha('#fff', 0.9),
          border: `1.5px solid ${alpha(colors.accent, 0.35)}`,
          borderRadius: 2,
          px: 1,
          py: 0.3,
          animation: `${bubblePulse} 3s ease-in-out infinite`,
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: -4,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderTop: `4px solid ${alpha('#fff', 0.9)}`,
          },
        }}
      >
        <Typography sx={{ fontSize: '0.55rem', fontWeight: 600, color: alpha('#000', 0.6) }}>
          {Array.isArray(config.reactions.idle) ? config.reactions.idle[0] : config.reactions.idle}
        </Typography>
      </Box>

      {/* Buddy emoji */}
      <Box
        sx={{
          fontSize: '2.8rem',
          lineHeight: 1,
          animation: `${gentleBounce} 2.5s ease-in-out infinite`,
          filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.1))',
        }}
      >
        {config.emoji}
      </Box>

      {/* Ground shadow */}
      <Box
        sx={{
          width: 36,
          height: 6,
          borderRadius: '50%',
          bgcolor: alpha(colors.accent, 0.15),
          mt: -0.5,
          animation: `${bubblePulse} 2.5s ease-in-out infinite`,
        }}
      />
    </Box>
  );
}

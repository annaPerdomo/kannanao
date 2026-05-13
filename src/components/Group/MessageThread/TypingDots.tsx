import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';

/** Bouncing dots animation shown while a message is sending */
export function TypingDots() {
  const { palette } = useTheme();
  const dotColor = palette.brand[400];

  return (
    <Box
      sx={{
        display: 'flex',
        gap: '4px',
        alignItems: 'center',
        '@keyframes bounce': {
          '0%, 60%, 100%': { transform: 'translateY(0)' },
          '30%': { transform: 'translateY(-4px)' },
        },
      }}
    >
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          sx={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: dotColor,
            animation: 'bounce 0.9s ease-in-out infinite',
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </Box>
  );
}

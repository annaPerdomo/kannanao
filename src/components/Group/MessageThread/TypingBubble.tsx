import Box from '@mui/material/Box';
import { alpha, useTheme } from '@mui/material/styles';

import { UserAvatar } from '@/components/UserAvatar';

interface TypingBubbleProps {
  initial: string;
  avatar?: string | null;
}

/** Cute animated typing indicator bubble shown when the other person is typing */
export function TypingBubble({ initial, avatar }: TypingBubbleProps) {
  const { palette } = useTheme();
  const { brand } = palette;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 0.75,
        animation: 'typingIn 0.35s ease-out both',
        '@keyframes typingIn': {
          from: { opacity: 0, transform: 'translateY(6px) scale(0.9)' },
          to: { opacity: 1, transform: 'translateY(0) scale(1)' },
        },
      }}
    >
      <UserAvatar
        avatar={avatar}
        name=""
        fallback={initial}
        size={34}
        sx={{
          mb: 0.3,
          animation: 'pulse 2s ease-in-out infinite',
          '@keyframes pulse': {
            '0%, 100%': { transform: 'scale(1)' },
            '50%': { transform: 'scale(1.08)' },
          },
        }}
      />
      <Box
        sx={{
          px: 1.8,
          py: 1.2,
          borderRadius: '16px 16px 16px 4px',
          bgcolor: alpha(brand[100], 0.5),
          border: `1px solid ${alpha(brand[200], 0.4)}`,
          display: 'flex',
          gap: '5px',
          alignItems: 'center',
          '@keyframes dotBounce': {
            '0%, 60%, 100%': { transform: 'translateY(0) scale(1)', opacity: 0.6 },
            '30%': { transform: 'translateY(-5px) scale(1.2)', opacity: 1 },
          },
        }}
      >
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            sx={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              bgcolor: brand[400],
              animation: 'dotBounce 1.2s ease-in-out infinite',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </Box>
    </Box>
  );
}

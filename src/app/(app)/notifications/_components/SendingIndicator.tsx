import SendIcon from '@mui/icons-material/Send';
import { Box, Typography } from '@mui/material';
import { keyframes } from '@mui/material/styles';

const sendDotBounce = keyframes`
  0%, 60%, 100% { transform: translateY(0) scale(1); opacity: 0.35; }
  30% { transform: translateY(-5px) scale(1.2); opacity: 1; }
`;

const sendIconRock = keyframes`
  0%, 100% { transform: translateY(0) rotate(-5deg); }
  50% { transform: translateY(-3px) rotate(5deg); }
`;

export const sendPulse = keyframes`
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
`;

const sendSlideIn = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
`;

interface SendingIndicatorProps {
  brandColor: string;
  accentColor: string;
  brandTextColor: string;
}

export function SendingIndicator({
  brandColor,
  accentColor,
  brandTextColor,
}: SendingIndicatorProps) {
  return (
    <Box
      sx={{
        px: 2,
        py: 0.75,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        flexShrink: 0,
        animation: `${sendSlideIn} 0.25s ease-out both`,
      }}
    >
      <SendIcon
        sx={{
          fontSize: 14,
          color: brandColor,
          animation: `${sendIconRock} 1s ease-in-out infinite`,
        }}
      />
      <Box sx={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${brandColor}, ${accentColor})`,
              animation: `${sendDotBounce} 1s ease-in-out infinite`,
              animationDelay: `${i * 0.18}s`,
            }}
          />
        ))}
      </Box>
      <Typography
        sx={{
          fontSize: '0.73rem',
          fontWeight: 700,
          color: brandTextColor,
          animation: `${sendPulse} 1.2s ease-in-out infinite`,
        }}
      >
        Sending...
      </Typography>
    </Box>
  );
}

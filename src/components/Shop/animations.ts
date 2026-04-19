import { keyframes } from '@mui/material/styles';

export const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
`;

export const sparkle = keyframes`
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
`;

export const coinBounce = keyframes`
  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
  50% { transform: translateY(-40px) rotate(180deg); opacity: 0.8; }
  100% { transform: translateY(-60px) rotate(360deg); opacity: 0; }
`;

export const celebrate = keyframes`
  0% { transform: scale(0.5); opacity: 0; }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
`;

import { keyframes } from '@mui/material/styles';

export const lineFadeIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const stageIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const stageFade = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

export const burstFloat = keyframes`
  0% { transform: scale(0); opacity: 0; }
  25% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(0.9) translateY(-26px); opacity: 0; }
`;

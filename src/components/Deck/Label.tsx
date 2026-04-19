import { Typography } from '@mui/material';

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      sx={{
        display: 'block',
        mb: 1.5,
        fontSize: '0.6rem',
        fontWeight: 800,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: 'primary.main',
      }}
    >
      {children}
    </Typography>
  );
}

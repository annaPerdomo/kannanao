'use client';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { useRouter } from 'next/navigation';

export function Footer() {
  const theme = useTheme();
  const { brand, surfaces } = theme.palette;
  const router = useRouter();

  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        borderTop: `1px solid ${alpha(brand[300], 0.3)}`,
        bgcolor: alpha(surfaces.glass, 0.6),
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        py: 2.5,
        px: { xs: 2, sm: 4 },
      }}
    >
      <Box
        sx={{
          maxWidth: 1100,
          mx: 'auto',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Link
          component="button"
          onClick={() => router.push('/landing')}
          underline="hover"
          sx={{
            fontFamily: '"DM Serif Display", serif',
            fontSize: '0.85rem',
            color: alpha(brand[700], 0.7),
            cursor: 'pointer',
            border: 'none',
            background: 'none',
            p: 0,
            '&:hover': { color: brand[700] },
          }}
        >
          About Kannanao
        </Link>

        <Typography
          sx={{
            fontFamily: '"DM Serif Display", serif',
            fontSize: '0.82rem',
            color: alpha(brand[700], 0.55),
          }}
        >
          Made with 💕 by{' '}
          <Link
            href="https://www.variationsonastring.com"
            target="_blank"
            rel="noopener noreferrer"
            underline="hover"
            sx={{
              fontFamily: '"DM Serif Display", serif',
              fontSize: '0.82rem',
              color: alpha(brand[700], 0.7),
              fontStyle: 'italic',
              '&:hover': { color: brand[700] },
            }}
          >
            Variations on a String
          </Link>
        </Typography>
      </Box>
    </Box>
  );
}

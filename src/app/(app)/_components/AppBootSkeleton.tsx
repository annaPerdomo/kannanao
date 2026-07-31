'use client';

import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import Skeleton from '@mui/material/Skeleton';
import { alpha, ThemeProvider } from '@mui/material/styles';
import Toolbar from '@mui/material/Toolbar';

import { AppBackground } from '@/components/AppBackground';
import { Loading } from '@/components/Loading';
import { AVATAR_SIZE } from '@/components/NavBar/constants';
import { APP_NAME } from '@/lib/brand';
import { createAppTheme, LAYOUT } from '@/theme';

// Boot loader shown while the root layout streams in the auth + provider data.
// It renders OUTSIDE the streamed providers (the real ThemeProvider lives inside
// the Suspense boundary), so it supplies its own default theme — letting it reuse
// the shared <Loading /> screen and <AppBackground />, plus a nav-bar skeleton —
// turning the old "blank until everything loads" into an app-shaped loading state.
const BOOT_THEME = createAppTheme('sakura');

/** Faithful placeholder for the sticky NavBar (see components/NavBar). */
function NavBarSkeleton() {
  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: (t) => t.palette.surfaces.glass,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: (t) => `1px solid ${alpha(t.palette.brand[300], 0.35)}`,
        boxShadow: (t) => `0 2px 20px ${alpha(t.palette.brand[300], 0.12)}`,
        // Tint every skeleton inside the bar with the brand color.
        '& .MuiSkeleton-root': { bgcolor: (t) => alpha(t.palette.brand[200], 0.55) },
      }}
    >
      <Toolbar
        sx={{
          maxWidth: LAYOUT.contentMaxWidth,
          width: '100%',
          mx: 'auto',
          px: LAYOUT.pagePx,
          minHeight: { xs: 56, sm: 64, md: 78 },
          gap: { xs: 1.5, md: 2.5 },
        }}
      >
        {/* Must match the real NavBar lockup so boot → hydration doesn't visibly swap. */}
        <Box
          component="img"
          src="/brand/logo-lockup.png"
          alt={APP_NAME}
          sx={{ display: 'block', height: { xs: 40, sm: 46, md: 60 }, width: 'auto', flex: 'none' }}
        />

        {/* Centered nav-link placeholders */}
        <Box
          sx={{
            display: { xs: 'none', sm: 'flex' },
            alignItems: 'center',
            gap: { sm: 0.25, md: 0.75 },
            mx: 'auto',
          }}
        >
          {[64, 64, 64, 64, 56].map((w, i) => (
            <Skeleton
              key={i}
              variant="rounded"
              width={w}
              height={30}
              sx={{ borderRadius: (t) => t.radii.pill }}
            />
          ))}
        </Box>

        {/* Right-side controls (XP / messages / avatar) */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 0.5, md: 1.25 },
            ml: { xs: 'auto', sm: 0 },
          }}
        >
          <Skeleton
            variant="rounded"
            width={72}
            height={30}
            sx={{ borderRadius: (t) => t.radii.pill, display: { xs: 'none', sm: 'block' } }}
          />
          <Skeleton variant="circular" width={32} height={32} />
          <Box sx={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}>
            <Skeleton variant="circular" sx={{ width: '100%', height: '100%' }} />
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default function AppBootSkeleton() {
  return (
    <ThemeProvider theme={BOOT_THEME}>
      <CssBaseline />
      <AppBackground>
        <NavBarSkeleton />
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loading />
        </Box>
      </AppBackground>
    </ThemeProvider>
  );
}

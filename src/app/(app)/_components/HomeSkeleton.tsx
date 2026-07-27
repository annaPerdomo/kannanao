'use client';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';

import { LoadingOverlay } from '@/components/Loading';

export default function HomeSkeleton() {
  return (
    <LoadingOverlay>
      <HomeSkeletonLayout />
    </LoadingOverlay>
  );
}

function HomeSkeletonLayout() {
  return (
    <Box
      sx={{
        maxWidth: 1600,
        mx: 'auto',
        px: { xs: 0.5, sm: 1, lg: 1 },
        py: { xs: 3, sm: 5 },
      }}
    >
      <Box sx={{ maxWidth: 1280, mx: 'auto', mb: 4 }}>
        <Skeleton
          variant="rounded"
          sx={{
            // Mirrors GreetingHero's sizing exactly; the wrong height shifts the page.
            aspectRatio: { xs: '1.363', sm: '4.764' },
            minHeight: { sm: 232, md: 240 },
            mb: { xs: 18, sm: 0 },
            borderRadius: (t) => t.radii.md,
            bgcolor: (t) => alpha(t.palette.brand[100], 0.6),
          }}
        />
      </Box>
      <Grid container spacing={2}>
        {[0, 1, 2, 3].map((i) => (
          <Grid size={{ xs: 12, md: 6 }} key={i}>
            <Stack spacing={1.5}>
              <Skeleton variant="text" width={160} height={32} />
              <Skeleton
                variant="rounded"
                height={180}
                sx={{ borderRadius: 3, bgcolor: (t) => alpha(t.palette.brand[100], 0.5) }}
              />
            </Stack>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

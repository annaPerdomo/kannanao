import Box from '@mui/material/Box';

import { Loading } from '@/components/Loading';

// Shown while a route's server component is resolving (e.g. right after login
// while the dashboard is being prepared). Prevents the previous page from
// lingering on screen during the navigation.
export default function RootLoading() {
  return (
    <Box
      sx={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Loading message="Loading…" />
    </Box>
  );
}

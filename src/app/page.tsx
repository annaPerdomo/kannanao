'use client';

import Home from '@/pages/Home';
import LandingPage from '@/app/landing/page';
import { useAuth } from '@/contexts/AuthContext';
import { Box, CircularProgress } from '@mui/material';

export default function HomePage() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: '#BE185D' }} />
      </Box>
    );
  }

  return session ? <Home /> : <LandingPage />;
}
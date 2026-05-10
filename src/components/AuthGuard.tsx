'use client';
import { Box, CircularProgress } from '@mui/material';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuth } from '@/contexts/AuthContext';

const PUBLIC_PREFIXES = ['/login', '/landing', '/embed', '/travel'];
const PUBLIC_EXACT = ['/'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublic =
    PUBLIC_EXACT.includes(pathname ?? '') || PUBLIC_PREFIXES.some((p) => pathname?.startsWith(p));

  useEffect(() => {
    if (loading) return;
    if (!session && !isPublic) {
      router.replace('/login');
    }
  }, [session, loading, isPublic, router]);

  if (loading) {
    return (
      <Box
        sx={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <CircularProgress sx={{ color: 'primary.dark' }} />
      </Box>
    );
  }

  if (!session && !isPublic) return null;

  return <>{children}</>;
}

'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuth } from '@/contexts/AuthContext';

export function LearnerRedirect({ to }: { to: string }) {
  const router = useRouter();
  const { isMemberAccount } = useAuth();
  useEffect(() => {
    if (isMemberAccount) router.replace(to);
  }, [isMemberAccount, router, to]);
  return null;
}

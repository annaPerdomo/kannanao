'use client';
import Box from '@mui/material/Box';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { Loading } from '@/components/Loading';
import { LAYOUT } from '@/theme';

/**
 * Legacy redirect: /group/members/[id] → /group/[groupId]/members/[id]
 * Looks up the member's group_id and redirects.
 */
export default function LegacyMemberDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';

  useEffect(() => {
    if (!id) return;
    // Fetch the member's group_id and redirect
    (async () => {
      try {
        const { sb } = await import('@/lib/supabase');
        const { data } = await sb.auth.getSession();
        const token = data.session?.access_token;
        if (!token) {
          router.push('/');
          return;
        }
        const res = await fetch(`/api/group/members/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          router.push('/group');
          return;
        }
        await res.json();
        // Try to find a group for this member — fall back to group list
        const membersRes = await fetch('/api/group/groups', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (membersRes.ok) {
          const groups = await membersRes.json();
          if (groups.length > 0) {
            router.replace(`/group/${groups[0].id}/members/${id}`);
            return;
          }
        }
        router.push('/group');
      } catch {
        router.push('/group');
      }
    })();
  }, [id, router]);

  return (
    <Box
      sx={{ maxWidth: LAYOUT.contentMaxWidth, mx: 'auto', px: LAYOUT.pagePx, py: { xs: 3, sm: 6 } }}
    >
      <Loading message="Redirecting..." />
    </Box>
  );
}

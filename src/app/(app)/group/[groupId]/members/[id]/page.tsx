'use client';
import Box from '@mui/material/Box';
import { useParams, useRouter } from 'next/navigation';

import { MemberDetail } from '@/components/Group';
import { useAuth } from '@/contexts/AuthContext';
import { useEncouragements } from '@/hooks/useEncouragements';
import { useMemberDetail } from '@/hooks/useGroup';
import { LAYOUT } from '@/theme';

export default function MemberDetailPage() {
  const router = useRouter();
  const params = useParams<{ groupId: string; id: string }>();
  const groupId = params?.groupId ?? '';
  const id = params?.id ?? null;
  const { isMemberAccount, loading: authLoading } = useAuth();
  const { detail, loading } = useMemberDetail(id);
  const { sendEncouragement } = useEncouragements();

  if (!authLoading && isMemberAccount) {
    router.push('/');
    return null;
  }

  return (
    <Box
      sx={{
        maxWidth: LAYOUT.contentMaxWidth,
        mx: 'auto',
        px: LAYOUT.pagePx,
        py: { xs: 3, sm: 5 },
      }}
    >
      <MemberDetail
        detail={detail!}
        loading={loading || authLoading}
        onBack={() => router.push(`/group/${groupId}`)}
        onSendEncouragement={sendEncouragement}
      />
    </Box>
  );
}

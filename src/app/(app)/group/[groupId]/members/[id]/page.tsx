'use client';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { DataErrorState } from '@/components/DataErrorState';
import { MemberDetail } from '@/components/Group';
import { Loading } from '@/components/Loading';
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
  const { detail, loading, error, refetch } = useMemberDetail(id);
  const { sendEncouragement } = useEncouragements();
  const tCommon = useTranslations('Common');
  const t = useTranslations('Group.memberDetail');

  if (!authLoading && isMemberAccount) {
    router.push('/');
    return null;
  }

  const boxSx = {
    maxWidth: LAYOUT.contentMaxWidth,
    mx: 'auto',
    px: LAYOUT.pagePx,
    py: { xs: 3, sm: 5 },
  };

  if (error && !detail && !loading) {
    return (
      <Box sx={boxSx}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push(`/group/${groupId}`)}>
          {tCommon('back')}
        </Button>
        <DataErrorState error={error} onRetry={() => void refetch()} />
      </Box>
    );
  }

  return (
    <Box sx={boxSx}>
      {detail ? (
        <MemberDetail
          detail={detail}
          loading={loading || authLoading}
          onBack={() => router.push(`/group/${groupId}`)}
          onSendEncouragement={sendEncouragement}
        />
      ) : (
        <Loading message={t('loadingMemberDetails')} />
      )}
    </Box>
  );
}

'use client';
import Stack from '@mui/material/Stack';
import { useTranslations } from 'next-intl';

import type { GroupMember } from '@/hooks/useGroup';

import { GroupEncouragementForm } from '../GroupEncouragementForm';
import { MembersPanel } from '../MembersPanel';
import { SectionCard } from '../SectionCard';

interface LearnersTabProps {
  members: GroupMember[];
  onSelectMember: (id: string) => void;
  onSendEncouragement: (memberId: string, message: string, emoji?: string) => Promise<unknown>;
}

export function LearnersTab({ members, onSelectMember, onSendEncouragement }: LearnersTabProps) {
  const t = useTranslations('Group.groupPage');

  return (
    <Stack spacing={2.5}>
      <MembersPanel members={members} onSelect={onSelectMember} />
      <SectionCard title={t('encouragementHeading')}>
        <GroupEncouragementForm members={members} onSend={onSendEncouragement} />
      </SectionCard>
    </Stack>
  );
}

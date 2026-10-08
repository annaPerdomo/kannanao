'use client';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

import { useGroupMembers } from '@/hooks/useGroup';
import type { Group } from '@/hooks/useGroups';

import { GroupSelect } from '../GroupSelect';

interface AssignPickerProps {
  groups: Group[];
  groupId: string;
  onGroupChange: (groupId: string) => void;
  memberIds: string[];
  onMemberIdsChange: (ids: string[]) => void;
  disabled: boolean;
  hideGroupSelect?: boolean;
}

export function AssignPicker({
  groups,
  groupId,
  onGroupChange,
  memberIds,
  onMemberIdsChange,
  disabled,
  hideGroupSelect = false,
}: AssignPickerProps) {
  const t = useTranslations('Materials.quizlet');
  const { members, loading, error } = useGroupMembers(groupId, Boolean(groupId));

  const toggle = (id: string) =>
    onMemberIdsChange(
      memberIds.includes(id) ? memberIds.filter((m) => m !== id) : [...memberIds, id],
    );

  return (
    <Stack spacing={1.5}>
      <Box>
        <Typography sx={{ fontWeight: 800 }}>{t('assignTitle')}</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
          {t('assignSubtitle')}
        </Typography>
      </Box>
      {!hideGroupSelect && (
        <GroupSelect
          groups={groups}
          value={groupId}
          disabled={disabled}
          size="small"
          onChange={(id) => {
            onGroupChange(id);
            onMemberIdsChange([]);
          }}
        />
      )}
      {loading && <CircularProgress size={24} aria-label={t('loadingMembers')} />}
      {error && <Alert severity="error">{t('membersFailed')}</Alert>}
      {!loading && !error && members.length === 0 && (
        <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
          {t('noMembers')}
        </Typography>
      )}
      <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: 'wrap' }}>
        {members.map((m) => {
          const on = memberIds.includes(m.id);
          return (
            <Chip
              key={m.id}
              label={m.displayName || m.username}
              color={on ? 'primary' : 'default'}
              variant={on ? 'filled' : 'outlined'}
              onClick={() => toggle(m.id)}
              disabled={disabled}
              aria-pressed={on}
            />
          );
        })}
      </Stack>
    </Stack>
  );
}

'use client';
import GroupsIcon from '@mui/icons-material/Groups';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Loading } from '@/components/Loading';
import { StyledDialog } from '@/components/StyledDialog';
import { useGroups } from '@/hooks/useGroups';

import { SourceRow } from './AddToPlan';

interface AddDeckToGroupDialogProps {
  open: boolean;
  onClose: () => void;
  deckId: string;
  deckName: string;
}

const TITLE_ID = 'add-deck-to-group-dialog-title';
const ROW_COLOR_KEYS = [50, 100, 200, 300, 400] as const;

export function AddDeckToGroupDialog({
  open,
  onClose,
  deckId,
  deckName,
}: AddDeckToGroupDialogProps) {
  const t = useTranslations('Group.addDeckToGroup');
  const tGroupCard = useTranslations('Group.groupCard');
  const theme = useTheme();
  const router = useRouter();
  const { groups, loading, error, errorMessage } = useGroups(open);

  const handlePick = (groupId: string) => {
    onClose();
    router.push(`/group/${groupId}?tab=lessons&assign=${deckId}`);
  };

  return (
    <StyledDialog
      open={open}
      onClose={onClose}
      title={t('dialogTitle')}
      subtitle={deckName}
      titleId={TITLE_ID}
    >
      {loading ? (
        <Loading message={t('loading')} />
      ) : error ? (
        <Alert severity="error">{errorMessage}</Alert>
      ) : groups.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Typography sx={{ fontSize: '2.5rem', mb: 1.5 }}>👥</Typography>
          <Typography sx={{ color: 'text.primary', fontSize: '0.9rem', mb: 2 }}>
            {t('emptyMessage')}
          </Typography>
          <Button
            variant="contained"
            startIcon={<GroupsIcon />}
            onClick={() => {
              onClose();
              router.push('/group');
            }}
          >
            {t('makeGroupButton')}
          </Button>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          {groups.map((group, index) => (
            <SourceRow
              key={group.id}
              glyph={group.emoji ?? '👥'}
              color={theme.palette.rainbow[ROW_COLOR_KEYS[index % ROW_COLOR_KEYS.length]]}
              title={group.name}
              description={tGroupCard('memberCount', { count: group.memberCount })}
              ariaLabel={t('openGroupAria', { name: group.name })}
              onActivate={() => handlePick(group.id)}
            />
          ))}
        </Box>
      )}
    </StyledDialog>
  );
}

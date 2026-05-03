'use client';

import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import {
  Alert,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useCallback, useMemo, useState } from 'react';

import { StyledDialog } from '@/components/StyledDialog';

interface GroupInfo {
  id: string;
  organizerId: string;
  name: string;
  emoji: string | null;
}

interface UserInfo {
  id: string;
  username: string;
  displayName: string | null;
  accountType: 'organizer' | 'member';
}

interface OrganizerOption {
  id: string;
  username: string;
  displayName: string | null;
}

interface ManageAccountDialogProps {
  open: boolean;
  onClose: () => void;
  user: UserInfo | null;
  organizers: OrganizerOption[];
  groups: GroupInfo[];
  accessToken: string;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

type AccountType = 'organizer' | 'member';

const NEW_GROUP_VALUE = '__new__';

export function ManageAccountDialog({
  open,
  onClose,
  user,
  organizers,
  groups,
  accessToken,
  onSuccess,
  onError,
}: ManageAccountDialogProps) {
  const theme = useTheme();
  const { brand } = theme.palette;

  const [accountType, setAccountType] = useState<AccountType>('organizer');
  const [organizerId, setOrganizerId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset form when user changes
  const initForm = useCallback((u: UserInfo | null) => {
    setAccountType(u?.accountType ?? 'organizer');
    setOrganizerId('');
    setGroupId('');
    setNewGroupName('');
    setSaving(false);
  }, []);

  // Re-init when dialog opens with a new user
  const prevUserIdRef = useMemo(() => ({ current: '' }), []);
  if (user && user.id !== prevUserIdRef.current) {
    prevUserIdRef.current = user.id;
    initForm(user);
  }

  const handleClose = useCallback(() => {
    prevUserIdRef.current = '';
    onClose();
  }, [onClose, prevUserIdRef]);

  const organizerGroups = useMemo(
    () => groups.filter((g) => g.organizerId === organizerId),
    [groups, organizerId],
  );

  // Only show organizers that are not the user being edited
  const availableOrganizers = useMemo(
    () => organizers.filter((o) => o.id !== user?.id),
    [organizers, user?.id],
  );

  const hasChanges = user
    ? accountType !== user.accountType ||
      (accountType === 'member' && (groupId || newGroupName.trim()))
    : false;

  const canSubmit =
    !saving &&
    hasChanges &&
    (accountType === 'organizer' || (organizerId && (groupId || newGroupName.trim())));

  const handleSubmit = async () => {
    if (!canSubmit || !user) return;
    setSaving(true);
    try {
      const isTypeChange = accountType !== user.accountType;
      const isGroupChange = !isTypeChange && accountType === 'member' && groupId;

      let body: Record<string, unknown>;

      if (isTypeChange) {
        body = { userId: user.id, action: 'changeAccountType', accountType };
        if (accountType === 'member') {
          body.organizerId = organizerId;
          if (groupId === NEW_GROUP_VALUE) {
            body.newGroupName = newGroupName.trim();
          } else {
            body.groupId = groupId;
          }
        }
      } else if (isGroupChange) {
        body = {
          userId: user.id,
          action: 'changeGroup',
          organizerId,
          ...(groupId === NEW_GROUP_VALUE ? { newGroupName: newGroupName.trim() } : { groupId }),
        };
      } else {
        return;
      }

      const res = await fetch('/api/admin', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        onError(json.error ?? 'Failed to update account.');
        setSaving(false);
      } else {
        onSuccess(json.message ?? 'Account updated!');
        handleClose();
      }
    } catch {
      onError('Network error.');
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <StyledDialog
      open={open}
      onClose={handleClose}
      title={`Manage Account`}
      subtitle={user.displayName ?? user.username}
      icon={<AdminPanelSettingsIcon />}
      maxWidth="xs"
      closeDisabled={saving}
      titleId="manage-account-dialog-title"
      actions={
        <>
          <Button
            onClick={handleClose}
            disabled={saving}
            sx={{ color: 'text.secondary', textTransform: 'none', borderRadius: 6 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            variant="contained"
            sx={{
              bgcolor: brand[700],
              color: '#fff',
              textTransform: 'none',
              borderRadius: 6,
              fontFamily: (t) => t.fonts.cute,
              '&:hover': { bgcolor: brand[800] },
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </>
      }
    >
      <Stack spacing={2} sx={{ mt: 1 }}>
        <Stack spacing={0.5}>
          <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', fontWeight: 500 }}>
            Account type
          </Typography>
          <ToggleButtonGroup
            value={accountType}
            exclusive
            onChange={(_, val) => {
              if (val) {
                setAccountType(val as AccountType);
                setOrganizerId('');
                setGroupId('');
                setNewGroupName('');
              }
            }}
            size="small"
            fullWidth
            sx={{
              '& .MuiToggleButton-root': {
                textTransform: 'none',
                fontFamily: theme.fonts.cute,
                fontWeight: 600,
                fontSize: '0.82rem',
                borderRadius: '12px !important',
                border: 'none',
                bgcolor: 'action.hover',
                '&.Mui-selected': {
                  bgcolor: brand[100],
                  color: brand[700],
                  '&:hover': { bgcolor: brand[200] },
                },
              },
            }}
          >
            <ToggleButton value="organizer">Organizer</ToggleButton>
            <ToggleButton value="member">Member</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {accountType === 'member' && (
          <>
            <FormControl fullWidth size="small">
              <InputLabel>Organizer</InputLabel>
              <Select
                value={organizerId}
                label="Organizer"
                onChange={(e) => {
                  setOrganizerId(e.target.value);
                  setGroupId('');
                  setNewGroupName('');
                }}
              >
                {availableOrganizers.map((o) => (
                  <MenuItem key={o.id} value={o.id}>
                    {o.displayName ?? o.username}
                    {o.displayName && (
                      <Typography
                        component="span"
                        sx={{ ml: 0.5, fontSize: '0.75rem', color: 'text.secondary' }}
                      >
                        @{o.username}
                      </Typography>
                    )}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {organizerId && (
              <FormControl fullWidth size="small">
                <InputLabel>Group</InputLabel>
                <Select
                  value={groupId}
                  label="Group"
                  onChange={(e) => {
                    setGroupId(e.target.value);
                    if (e.target.value !== NEW_GROUP_VALUE) setNewGroupName('');
                  }}
                >
                  {organizerGroups.map((g) => (
                    <MenuItem key={g.id} value={g.id}>
                      {g.emoji ? `${g.emoji} ` : ''}
                      {g.name}
                    </MenuItem>
                  ))}
                  <MenuItem value={NEW_GROUP_VALUE}>
                    <Typography sx={{ fontStyle: 'italic', color: brand[600] }}>
                      + Create new group
                    </Typography>
                  </MenuItem>
                </Select>
              </FormControl>
            )}

            {groupId === NEW_GROUP_VALUE && (
              <TextField
                fullWidth
                size="small"
                label="New group name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
            )}

            {accountType !== user.accountType && (
              <Alert severity="info" sx={{ fontSize: '0.78rem' }}>
                Converting to member will link this account to the selected organizer and group.
              </Alert>
            )}
          </>
        )}

        {accountType === 'organizer' && user.accountType === 'member' && (
          <Alert severity="info" sx={{ fontSize: '0.78rem' }}>
            Promoting to organizer will remove the group and organizer association.
          </Alert>
        )}
      </Stack>
    </StyledDialog>
  );
}

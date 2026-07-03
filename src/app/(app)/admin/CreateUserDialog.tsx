'use client';

import PersonAddIcon from '@mui/icons-material/PersonAdd';
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

interface OrganizerOption {
  id: string;
  username: string;
  displayName: string | null;
}

interface CreateUserDialogProps {
  open: boolean;
  onClose: () => void;
  organizers: OrganizerOption[];
  groups: GroupInfo[];
  accessToken: string;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

type AccountType = 'organizer' | 'member';

const NEW_GROUP_VALUE = '__new__';

export function CreateUserDialog({
  open,
  onClose,
  organizers,
  groups,
  accessToken,
  onSuccess,
  onError,
}: CreateUserDialogProps) {
  const theme = useTheme();
  const { brand } = theme.palette;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('organizer');
  const [organizerId, setOrganizerId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [saving, setSaving] = useState(false);

  const resetForm = useCallback(() => {
    setUsername('');
    setPassword('');
    setDisplayName('');
    setAccountType('organizer');
    setOrganizerId('');
    setGroupId('');
    setNewGroupName('');
    setSaving(false);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const organizerGroups = useMemo(
    () => groups.filter((g) => g.organizerId === organizerId),
    [groups, organizerId],
  );

  const canSubmit =
    username.trim().length >= 2 &&
    password.length >= 6 &&
    !saving &&
    (accountType === 'organizer' || (organizerId && (groupId || newGroupName.trim())));

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        username: username.trim(),
        password,
        displayName: displayName.trim() || undefined,
        accountType,
      };
      if (accountType === 'member') {
        body.organizerId = organizerId;
        if (groupId === NEW_GROUP_VALUE) {
          body.newGroupName = newGroupName.trim();
        } else {
          body.groupId = groupId;
        }
      }

      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        onError(json.error ?? 'Failed to create user.');
        setSaving(false);
      } else {
        onSuccess(json.message ?? 'User created!');
        handleClose();
      }
    } catch {
      onError('Network error.');
      setSaving(false);
    }
  };

  return (
    <StyledDialog
      open={open}
      onClose={handleClose}
      title="Create User"
      icon={<PersonAddIcon />}
      maxWidth="xs"
      closeDisabled={saving}
      titleId="create-user-dialog-title"
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
            {saving ? 'Creating...' : 'Create'}
          </Button>
        </>
      }
    >
      <Stack spacing={2} sx={{ mt: 1 }}>
        <TextField
          autoFocus
          fullWidth
          size="small"
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          helperText="Letters, numbers, _ or - (2-30 chars)"
        />
        <TextField
          fullWidth
          size="small"
          type="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          helperText="Minimum 6 characters"
        />
        <TextField
          fullWidth
          size="small"
          label="Display name (optional)"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />

        <Stack spacing={0.5}>
          <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', fontWeight: 500 }}>
            Account type
          </Typography>
          <ToggleButtonGroup
            value={accountType}
            exclusive
            onChange={(_, val) => {
              if (val) setAccountType(val as AccountType);
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
                {organizers.map((o) => (
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

            {accountType === 'member' && organizerId && (
              <Alert severity="info" sx={{ fontSize: '0.78rem' }}>
                The organizer&apos;s decks will be automatically shared with this member.
              </Alert>
            )}
          </>
        )}
      </Stack>
    </StyledDialog>
  );
}

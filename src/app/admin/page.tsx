'use client';

import AddIcon from '@mui/icons-material/Add';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import BadgeIcon from '@mui/icons-material/Badge';
import BarChartIcon from '@mui/icons-material/BarChart';
import ChecklistIcon from '@mui/icons-material/Checklist';
import EditIcon from '@mui/icons-material/Edit';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import GroupIcon from '@mui/icons-material/Group';
import KeyIcon from '@mui/icons-material/Key';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import PeopleIcon from '@mui/icons-material/People';
import StyleIcon from '@mui/icons-material/Style';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useCallback, useEffect, useState } from 'react';

import { Loading } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { LAYOUT } from '@/theme';

import { CreateUserDialog } from './CreateUserDialog';
import { ManageAccountDialog } from './ManageAccountDialog';

interface UserStat {
  id: string;
  username: string;
  displayName: string | null;
  colorScheme: string | null;
  accountType: 'organizer' | 'member';
  createdAt: string;
  deckCount: number;
  cardCount: number;
  todoCount: number;
  todoCompletions: number;
  eventTypeCount: number;
  publicDecks: number;
}

interface EmbedDeckStat {
  deckId: string;
  deckName: string;
  deckEmoji: string;
  totalViews: number;
  uniqueSessions: number;
  completions: number;
  avgDurationSeconds: number | null;
  lastViewedAt: string | null;
}

interface WaitlistEntry {
  id: string;
  email: string;
  name: string | null;
  message: string | null;
  created_at: string;
}

interface GroupInfo {
  id: string;
  organizerId: string;
  name: string;
  emoji: string | null;
}

interface AdminData {
  overview: {
    totalUsers: number;
    totalDecks: number;
    totalCards: number;
    totalTodos: number;
    totalWaitlist: number;
    totalEventTypes: number;
  };
  users: UserStat[];
  waitlist: WaitlistEntry[];
  embedAnalytics: {
    overview: {
      totalViews: number;
      totalSessions: number;
      totalCompletions: number;
    };
    decks: EmbedDeckStat[];
  };
  groups: GroupInfo[];
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  const theme = useTheme();
  const { brand, surfaces } = theme.palette;
  return (
    <Paper
      sx={{
        p: 2.5,
        borderRadius: 4,
        bgcolor: surfaces.glass,
        border: `1px solid ${alpha(brand[200], 0.4)}`,
        flex: '1 1 140px',
        textAlign: 'center',
      }}
    >
      <Box sx={{ color: brand[500], mb: 0.5 }}>{icon}</Box>
      <Typography
        sx={{
          fontFamily: (t) => t.fonts.cute,
          fontSize: '1.8rem',
          color: brand[700],
          lineHeight: 1.1,
          fontWeight: 700,
        }}
      >
        {value}
      </Typography>
      <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mt: 0.5 }}>
        {label}
      </Typography>
    </Paper>
  );
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function AdminPage() {
  const theme = useTheme();
  const { brand, surfaces } = theme.palette;
  const { session } = useAuth();
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit dialogs
  const [editUser, setEditUser] = useState<UserStat | null>(null);
  const [editType, setEditType] = useState<'username' | 'password' | 'displayName' | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [manageUser, setManageUser] = useState<UserStat | null>(null);

  const openEdit = (user: UserStat, type: 'username' | 'password' | 'displayName') => {
    setEditUser(user);
    setEditType(type);
    setInputValue(
      type === 'username' ? user.username : type === 'displayName' ? (user.displayName ?? '') : '',
    );
  };

  const closeEdit = () => {
    setEditUser(null);
    setEditType(null);
    setInputValue('');
    setSaving(false);
  };

  const handleSaveEdit = async () => {
    if (!editUser || !editType || !session?.access_token) return;
    setSaving(true);
    try {
      const body =
        editType === 'password'
          ? { userId: editUser.id, action: 'changePassword', password: inputValue }
          : editType === 'displayName'
            ? { userId: editUser.id, action: 'changeDisplayName', displayName: inputValue }
            : { userId: editUser.id, action: 'changeUsername', username: inputValue };

      const res = await fetch('/api/admin', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setSnack({ msg: json.error ?? 'Failed to update.', severity: 'error' });
      } else {
        setSnack({ msg: json.message ?? 'Updated!', severity: 'success' });
        if (editType === 'username') void fetchData(); // refresh table
        if (editType === 'displayName') void fetchData();
      }
      closeEdit();
    } catch {
      setSnack({ msg: 'Network error.', severity: 'error' });
      setSaving(false);
    }
  };

  const fetchData = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const res = await fetch('/api/admin', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (res.status === 403) {
        setError('You do not have permission to view this page.');
        return;
      }
      if (!res.ok) {
        setError(json?.error ?? 'Failed to load admin data.');
        return;
      }
      setData(json);
    } catch {
      setError('Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (loading) return <Loading />;
  if (error)
    return (
      <Box sx={{ maxWidth: LAYOUT.narrowMaxWidth, mx: 'auto', px: LAYOUT.pagePx, mt: 6 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  if (!data) return null;

  const tablePaperSx = {
    borderRadius: 4,
    border: `1px solid ${alpha(brand[200], 0.4)}`,
    bgcolor: surfaces.glass,
    overflow: 'hidden',
  };

  const headerCellSx = {
    fontFamily: theme.fonts.cute,
    fontWeight: 600,
    color: brand[700],
    fontSize: '0.82rem',
    borderBottom: `2px solid ${alpha(brand[300], 0.3)}`,
    bgcolor: alpha(brand[50], 0.5),
  };

  const bodyCellSx = {
    fontSize: '0.82rem',
    borderBottom: `1px solid ${alpha(brand[200], 0.25)}`,
  };

  return (
    <Box
      sx={{
        maxWidth: LAYOUT.contentMaxWidth,
        mx: 'auto',
        px: LAYOUT.pagePx,
        py: { xs: 2, sm: 4 },
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      <PageHeader
        emoji="🔧"
        title="Admin Dashboard"
        subtitle="Manage users, analytics, and waitlist"
        mb={0}
      />

      {/* Overview Stats */}
      <Stack direction="row" flexWrap="wrap" gap={2} sx={{ mb: 4 }}>
        <StatCard icon={<PeopleIcon />} label="Users" value={data.overview.totalUsers} />
        <StatCard icon={<LibraryBooksIcon />} label="Decks" value={data.overview.totalDecks} />
        <StatCard icon={<StyleIcon />} label="Cards" value={data.overview.totalCards} />
        <StatCard icon={<ChecklistIcon />} label="Todos" value={data.overview.totalTodos} />
        <StatCard icon={<MailOutlineIcon />} label="Waitlist" value={data.overview.totalWaitlist} />
      </Stack>

      <Divider sx={{ mb: 4 }} />

      {/* Users Table */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography
          sx={{
            fontFamily: (t) => t.fonts.cute,
            fontWeight: 600,
            fontSize: '1.2rem',
            color: brand[700],
          }}
        >
          Users ({data.users.length})
        </Typography>
        <Button
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
          variant="contained"
          size="small"
          sx={{
            bgcolor: brand[700],
            color: '#fff',
            textTransform: 'none',
            borderRadius: 6,
            fontFamily: (t) => t.fonts.cute,
            '&:hover': { bgcolor: brand[800] },
          }}
        >
          Create User
        </Button>
      </Stack>

      <TableContainer component={Paper} sx={{ ...tablePaperSx, mb: 4 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={headerCellSx}>User</TableCell>
              <TableCell sx={headerCellSx} align="center">
                Type
              </TableCell>
              <TableCell sx={headerCellSx} align="center">
                Decks
              </TableCell>
              <TableCell sx={headerCellSx} align="center">
                Cards
              </TableCell>
              <TableCell sx={headerCellSx} align="center">
                Public
              </TableCell>
              <TableCell sx={headerCellSx} align="center">
                Todos
              </TableCell>
              <TableCell sx={headerCellSx} align="center">
                Completions
              </TableCell>
              <TableCell sx={headerCellSx} align="center">
                Theme
              </TableCell>
              <TableCell sx={headerCellSx}>Joined</TableCell>
              <TableCell sx={headerCellSx} align="center">
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.users.map((u) => (
              <TableRow key={u.id} hover>
                <TableCell sx={bodyCellSx}>
                  <Box>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
                      {u.displayName ?? u.username}
                    </Typography>
                    {u.displayName && (
                      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                        @{u.username}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell sx={bodyCellSx} align="center">
                  <Chip
                    label={u.accountType}
                    size="small"
                    variant={u.accountType === 'member' ? 'outlined' : 'filled'}
                    sx={{
                      fontSize: '0.7rem',
                      height: 22,
                      ...(u.accountType === 'organizer'
                        ? {
                            bgcolor: alpha(brand[100], 0.5),
                            color: brand[700],
                          }
                        : {
                            borderColor: alpha(brand[300], 0.6),
                            color: brand[500],
                          }),
                    }}
                  />
                </TableCell>
                <TableCell sx={bodyCellSx} align="center">
                  {u.deckCount}
                </TableCell>
                <TableCell sx={bodyCellSx} align="center">
                  {u.cardCount}
                </TableCell>
                <TableCell sx={bodyCellSx} align="center">
                  {u.publicDecks}
                </TableCell>
                <TableCell sx={bodyCellSx} align="center">
                  {u.todoCount}
                </TableCell>
                <TableCell sx={bodyCellSx} align="center">
                  {u.todoCompletions}
                </TableCell>
                <TableCell sx={bodyCellSx} align="center">
                  {u.colorScheme ? (
                    <Chip
                      label={u.colorScheme}
                      size="small"
                      sx={{
                        fontSize: '0.7rem',
                        height: 22,
                        bgcolor: alpha(brand[100], 0.5),
                        color: brand[700],
                      }}
                    />
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell sx={bodyCellSx}>{formatDate(u.createdAt)}</TableCell>
                <TableCell sx={bodyCellSx} align="center">
                  <IconButton
                    size="small"
                    aria-label={`Manage account for ${u.username}`}
                    title="Manage account type & group"
                    onClick={() => setManageUser(u)}
                    sx={{ color: brand[500] }}
                  >
                    <AdminPanelSettingsIcon sx={{ fontSize: '1rem' }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    aria-label={`Change display name for ${u.username}`}
                    title="Change display name"
                    onClick={() => openEdit(u, 'displayName')}
                    sx={{ color: brand[500] }}
                  >
                    <BadgeIcon sx={{ fontSize: '1rem' }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    aria-label={`Change username for ${u.username}`}
                    title="Change username"
                    onClick={() => openEdit(u, 'username')}
                    sx={{ color: brand[500] }}
                  >
                    <EditIcon sx={{ fontSize: '1rem' }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    aria-label={`Change password for ${u.username}`}
                    title="Change password"
                    onClick={() => openEdit(u, 'password')}
                    sx={{ color: brand[500] }}
                  >
                    <KeyIcon sx={{ fontSize: '1rem' }} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Divider sx={{ mb: 4 }} />

      {/* Waitlist Table */}
      <Typography
        sx={{
          fontFamily: (t) => t.fonts.cute,
          fontWeight: 600,
          fontSize: '1.2rem',
          color: brand[700],
          mb: 2,
        }}
      >
        Waitlist ({data.waitlist.length})
      </Typography>

      {data.waitlist.length === 0 ? (
        <Paper sx={{ ...tablePaperSx, p: 3, textAlign: 'center' }}>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.88rem' }}>
            No waitlist entries yet.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={tablePaperSx}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={headerCellSx}>Email</TableCell>
                <TableCell sx={headerCellSx}>Name</TableCell>
                <TableCell sx={headerCellSx}>Message</TableCell>
                <TableCell sx={headerCellSx}>Signed Up</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.waitlist.map((w) => (
                <TableRow key={w.id} hover>
                  <TableCell sx={bodyCellSx}>{w.email}</TableCell>
                  <TableCell sx={bodyCellSx}>{w.name ?? '—'}</TableCell>
                  <TableCell
                    sx={{
                      ...bodyCellSx,
                      maxWidth: 260,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {w.message ?? '—'}
                  </TableCell>
                  <TableCell sx={bodyCellSx}>{formatDate(w.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Divider sx={{ mb: 4, mt: 4 }} />

      {/* Embed Analytics */}
      <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2 }}>
        <BarChartIcon sx={{ color: brand[500] }} />
        <Typography
          sx={{
            fontFamily: (t) => t.fonts.cute,
            fontWeight: 600,
            fontSize: '1.2rem',
            color: brand[700],
          }}
        >
          Embed Analytics
        </Typography>
      </Stack>

      <Stack direction="row" flexWrap="wrap" gap={2} sx={{ mb: 3 }}>
        <StatCard
          icon={<VisibilityIcon />}
          label="Total Views"
          value={data.embedAnalytics.overview.totalViews}
        />
        <StatCard
          icon={<GroupIcon />}
          label="Unique Sessions"
          value={data.embedAnalytics.overview.totalSessions}
        />
        <StatCard
          icon={<EmojiEventsIcon />}
          label="Completions"
          value={data.embedAnalytics.overview.totalCompletions}
        />
      </Stack>

      {data.embedAnalytics.decks.length === 0 ? (
        <Paper sx={{ ...tablePaperSx, p: 3, textAlign: 'center', mb: 4 }}>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.88rem' }}>
            No embed views yet. Share a public deck&apos;s embed link to start collecting data.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ ...tablePaperSx, mb: 4 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={headerCellSx}>Deck</TableCell>
                <TableCell sx={headerCellSx} align="center">
                  Views
                </TableCell>
                <TableCell sx={headerCellSx} align="center">
                  Sessions
                </TableCell>
                <TableCell sx={headerCellSx} align="center">
                  Completions
                </TableCell>
                <TableCell sx={headerCellSx} align="center">
                  Avg Duration
                </TableCell>
                <TableCell sx={headerCellSx}>Last Viewed</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.embedAnalytics.decks.map((d) => (
                <TableRow key={d.deckId} hover>
                  <TableCell sx={bodyCellSx}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontSize: '1rem' }}>{d.deckEmoji}</Typography>
                      <Box>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
                          {d.deckName}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: '0.7rem',
                            color: 'text.secondary',
                            fontFamily: (t) => t.fonts.mono,
                          }}
                        >
                          {d.deckId.slice(0, 8)}…
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={bodyCellSx} align="center">
                    {d.totalViews}
                  </TableCell>
                  <TableCell sx={bodyCellSx} align="center">
                    {d.uniqueSessions}
                  </TableCell>
                  <TableCell sx={bodyCellSx} align="center">
                    {d.completions > 0 ? (
                      <Chip
                        label={d.completions}
                        size="small"
                        sx={{
                          fontSize: '0.7rem',
                          height: 22,
                          bgcolor: alpha(brand[100], 0.5),
                          color: brand[700],
                        }}
                      />
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell sx={bodyCellSx} align="center">
                    {d.avgDurationSeconds != null
                      ? d.avgDurationSeconds >= 60
                        ? `${Math.floor(d.avgDurationSeconds / 60)}m ${d.avgDurationSeconds % 60}s`
                        : `${d.avgDurationSeconds}s`
                      : '—'}
                  </TableCell>
                  <TableCell sx={bodyCellSx}>{formatDate(d.lastViewedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Edit User Dialog */}
      <Dialog
        open={Boolean(editUser && editType)}
        onClose={closeEdit}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 4,
              border: `1px solid ${alpha(brand[300], 0.35)}`,
              boxShadow: `0 8px 40px ${alpha(brand[700], 0.12)}`,
              bgcolor: surfaces.overlay,
              minWidth: 340,
            },
          },
        }}
      >
        <DialogTitle
          sx={{ fontFamily: (t) => t.fonts.cute, fontWeight: 600, color: brand[700], pb: 1 }}
        >
          {editType === 'password'
            ? 'Change Password'
            : editType === 'displayName'
              ? 'Change Display Name'
              : 'Change Username'}
          {editUser && (
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', fontFamily: 'inherit', mt: 0.25 }}
            >
              {editUser.displayName ?? editUser.username}
              {editUser.displayName && ` (@${editUser.username})`}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <TextField
            autoFocus
            fullWidth
            size="small"
            type={editType === 'password' ? 'password' : 'text'}
            label={
              editType === 'password'
                ? 'New password'
                : editType === 'displayName'
                  ? 'New display name'
                  : 'New username'
            }
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleSaveEdit();
            }}
            helperText={
              editType === 'password'
                ? 'Minimum 6 characters'
                : editType === 'displayName'
                  ? 'The name shown in the app'
                  : 'Letters, numbers, _ or - (2–30 chars)'
            }
            sx={{ mt: 0.5 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={closeEdit}
            sx={{ color: 'text.secondary', textTransform: 'none', borderRadius: 6 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveEdit}
            disabled={saving || !inputValue.trim()}
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
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create User Dialog */}
      {session?.access_token && data && (
        <CreateUserDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          organizers={data.users
            .filter((u) => u.accountType === 'organizer')
            .map((u) => ({ id: u.id, username: u.username, displayName: u.displayName }))}
          groups={data.groups}
          accessToken={session.access_token}
          onSuccess={(msg) => {
            setSnack({ msg, severity: 'success' });
            void fetchData();
          }}
          onError={(msg) => setSnack({ msg, severity: 'error' })}
        />
      )}

      {/* Manage Account Dialog */}
      {session?.access_token && data && (
        <ManageAccountDialog
          open={Boolean(manageUser)}
          onClose={() => setManageUser(null)}
          user={manageUser}
          organizers={data.users
            .filter((u) => u.accountType === 'organizer')
            .map((u) => ({ id: u.id, username: u.username, displayName: u.displayName }))}
          groups={data.groups}
          accessToken={session.access_token}
          onSuccess={(msg) => {
            setSnack({ msg, severity: 'success' });
            void fetchData();
          }}
          onError={(msg) => setSnack({ msg, severity: 'error' })}
        />
      )}

      {/* Snackbar */}
      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snack?.severity ?? 'success'}
          onClose={() => setSnack(null)}
          sx={{ width: '100%' }}
        >
          {snack?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

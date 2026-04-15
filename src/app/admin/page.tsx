'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Box, Container, Typography, Paper, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Stack, Divider,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import StyleIcon from '@mui/icons-material/Style';
import ChecklistIcon from '@mui/icons-material/Checklist';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import { useTheme, alpha } from '@mui/material/styles';
import { useAuth } from '@/contexts/AuthContext';
import { Loading } from '@/components/Loading';

interface UserStat {
  id: string;
  username: string;
  displayName: string | null;
  colorScheme: string | null;
  createdAt: string;
  deckCount: number;
  cardCount: number;
  todoCount: number;
  todoCompletions: number;
  eventTypeCount: number;
  publicDecks: number;
}

interface WaitlistEntry {
  id: string;
  email: string;
  name: string | null;
  message: string | null;
  created_at: string;
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
      <Typography sx={{ fontFamily: '"DM Serif Display", serif', fontSize: '1.8rem', color: brand[700], lineHeight: 1.1 }}>
        {value}
      </Typography>
      <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mt: 0.5 }}>{label}</Typography>
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

  const fetchData = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const res = await fetch('/api/admin', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.status === 403) {
        setError('You do not have permission to view this page.');
        return;
      }
      if (!res.ok) {
        setError('Failed to load admin data.');
        return;
      }
      setData(await res.json());
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
  if (error) return <Container maxWidth="md" sx={{ mt: 6 }}><Alert severity="error">{error}</Alert></Container>;
  if (!data) return null;

  const tablePaperSx = {
    borderRadius: 4,
    border: `1px solid ${alpha(brand[200], 0.4)}`,
    bgcolor: surfaces.glass,
    overflow: 'hidden',
  };

  const headerCellSx = {
    fontFamily: '"DM Serif Display", serif',
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
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography
        sx={{
          fontFamily: '"DM Serif Display", serif',
          fontSize: { xs: '1.6rem', sm: '2rem' },
          color: brand[700],
          mb: 3,
        }}
      >
        Admin Dashboard
      </Typography>

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
      <Typography
        sx={{
          fontFamily: '"DM Serif Display", serif',
          fontSize: '1.2rem',
          color: brand[700],
          mb: 2,
        }}
      >
        Users ({data.users.length})
      </Typography>

      <TableContainer component={Paper} sx={{ ...tablePaperSx, mb: 4 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={headerCellSx}>User</TableCell>
              <TableCell sx={headerCellSx} align="center">Decks</TableCell>
              <TableCell sx={headerCellSx} align="center">Cards</TableCell>
              <TableCell sx={headerCellSx} align="center">Public</TableCell>
              <TableCell sx={headerCellSx} align="center">Todos</TableCell>
              <TableCell sx={headerCellSx} align="center">Completions</TableCell>
              <TableCell sx={headerCellSx} align="center">Theme</TableCell>
              <TableCell sx={headerCellSx}>Joined</TableCell>
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
                <TableCell sx={bodyCellSx} align="center">{u.deckCount}</TableCell>
                <TableCell sx={bodyCellSx} align="center">{u.cardCount}</TableCell>
                <TableCell sx={bodyCellSx} align="center">{u.publicDecks}</TableCell>
                <TableCell sx={bodyCellSx} align="center">{u.todoCount}</TableCell>
                <TableCell sx={bodyCellSx} align="center">{u.todoCompletions}</TableCell>
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
                  ) : '—'}
                </TableCell>
                <TableCell sx={bodyCellSx}>{formatDate(u.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Divider sx={{ mb: 4 }} />

      {/* Waitlist Table */}
      <Typography
        sx={{
          fontFamily: '"DM Serif Display", serif',
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
                  <TableCell sx={{ ...bodyCellSx, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {w.message ?? '—'}
                  </TableCell>
                  <TableCell sx={bodyCellSx}>{formatDate(w.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
}

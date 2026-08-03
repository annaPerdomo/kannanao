'use client';

import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import {
  Box,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, type SxProps, type Theme, useTheme } from '@mui/material/styles';

import type { MemberActivityEntry } from './types';

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatMins(mins: number) {
  if (mins < 1) return '<1m';
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${mins}m`;
}

interface MemberActivityProps {
  members: MemberActivityEntry[];
  tablePaperSx: SxProps<Theme>;
  headerCellSx: SxProps<Theme>;
  bodyCellSx: SxProps<Theme>;
}

export function MemberActivity({
  members,
  tablePaperSx,
  headerCellSx,
  bodyCellSx,
}: MemberActivityProps) {
  const theme = useTheme();
  const { brand } = theme.palette;

  if (members.length === 0) return null;

  return (
    <>
      <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2 }}>
        <FitnessCenterIcon sx={{ color: brand[500] }} />
        <Typography
          sx={{
            fontFamily: (t) => t.fonts.cute,
            fontWeight: 600,
            fontSize: '1.2rem',
            color: brand[700],
          }}
        >
          Member Activity
        </Typography>
      </Stack>

      <TableContainer component={Paper} sx={{ ...tablePaperSx, mb: 4 } as SxProps<Theme>}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={headerCellSx}>Member</TableCell>
              <TableCell sx={headerCellSx} align="center">
                <Tooltip title="Total study sessions (all time)" arrow>
                  <span>Sessions</span>
                </Tooltip>
              </TableCell>
              <TableCell sx={headerCellSx} align="center">
                <Tooltip title="Study sessions in the last 7 days" arrow>
                  <span>Last 7d</span>
                </Tooltip>
              </TableCell>
              <TableCell sx={headerCellSx} align="center">
                Cards Studied
              </TableCell>
              <TableCell sx={headerCellSx} align="center">
                <Tooltip title="Percentage of cards answered correctly" arrow>
                  <span>Accuracy</span>
                </Tooltip>
              </TableCell>
              <TableCell sx={headerCellSx} align="center">
                Total Time
              </TableCell>
              <TableCell sx={headerCellSx}>Last Active</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {members.map((m) => {
              // Determine activity status
              const lastActive = m.lastActiveAt ? new Date(m.lastActiveAt) : null;
              const daysSince = lastActive
                ? Math.floor((Date.now() - lastActive.getTime()) / 86_400_000)
                : null;
              const isRecent = daysSince != null && daysSince <= 7;
              const isInactive = daysSince == null || daysSince > 30;

              return (
                <TableRow key={m.userId} hover>
                  <TableCell sx={bodyCellSx}>
                    <Box>
                      <Stack direction="row" alignItems="center" gap={0.75}>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
                          {m.displayName ?? m.username}
                        </Typography>
                        {m.accountType === 'organizer' && (
                          <Tooltip
                            title="Organizer tier — studies in a group and runs their own"
                            arrow
                          >
                            <Chip
                              label="organizer"
                              size="small"
                              sx={{
                                fontSize: '0.62rem',
                                height: 18,
                                bgcolor: alpha(brand[500], 0.15),
                                color: 'text.primary',
                                fontWeight: 600,
                              }}
                            />
                          </Tooltip>
                        )}
                      </Stack>
                      {m.displayName && (
                        <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                          @{m.username}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell sx={bodyCellSx} align="center">
                    {m.totalSessions}
                  </TableCell>
                  <TableCell sx={bodyCellSx} align="center">
                    {m.recentSessions > 0 ? (
                      <Chip
                        label={m.recentSessions}
                        size="small"
                        sx={{
                          fontSize: '0.7rem',
                          height: 22,
                          bgcolor: alpha(theme.palette.success.main, 0.15),
                          color: theme.palette.success.dark,
                          fontWeight: 600,
                        }}
                      />
                    ) : (
                      <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                        0
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={bodyCellSx} align="center">
                    {m.totalCardsStudied}
                  </TableCell>
                  <TableCell sx={bodyCellSx} align="center">
                    {m.accuracy != null ? (
                      <Chip
                        label={`${m.accuracy}%`}
                        size="small"
                        sx={{
                          fontSize: '0.7rem',
                          height: 22,
                          bgcolor:
                            m.accuracy >= 80
                              ? alpha(theme.palette.success.main, 0.15)
                              : m.accuracy >= 50
                                ? alpha(theme.palette.warning.main, 0.15)
                                : alpha(theme.palette.error.main, 0.12),
                          color:
                            m.accuracy >= 80
                              ? theme.palette.success.dark
                              : m.accuracy >= 50
                                ? theme.palette.warning.dark
                                : theme.palette.error.dark,
                          fontWeight: 600,
                        }}
                      />
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell sx={bodyCellSx} align="center">
                    {formatMins(m.totalDurationMins)}
                  </TableCell>
                  <TableCell sx={bodyCellSx}>
                    <Stack direction="row" alignItems="center" gap={0.75}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: isRecent
                            ? theme.palette.success.main
                            : isInactive
                              ? theme.palette.grey[400]
                              : theme.palette.warning.main,
                        }}
                      />
                      <Typography sx={{ fontSize: '0.82rem' }}>
                        {formatDate(m.lastActiveAt)}
                      </Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}

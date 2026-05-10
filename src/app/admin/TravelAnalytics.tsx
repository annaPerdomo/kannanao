'use client';

import ExploreIcon from '@mui/icons-material/Explore';
import GroupIcon from '@mui/icons-material/Group';
import PeopleIcon from '@mui/icons-material/People';
import TimelineIcon from '@mui/icons-material/Timeline';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import {
  Box,
  Chip,
  LinearProgress,
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

import type { TravelAnalyticsData } from './types';

const FEATURE_LABELS: Record<string, { label: string; icon: string }> = {
  hub: { label: 'Travel Hub', icon: '✈️' },
  scenario: { label: 'Scenario Practice', icon: '🎭' },
  show_card: { label: 'Show Cards', icon: '🪧' },
  phrases: { label: 'Survival Phrases', icon: '💬' },
  culture: { label: 'Culture Guide', icon: '⛩️' },
  katakana: { label: 'Katakana Decoder', icon: '🔤' },
  listening: { label: 'What Did They Say?', icon: '👂' },
  daily_phrase: { label: 'Daily Phrase Pack', icon: '📅' },
  emergency: { label: 'Emergency Card', icon: '🆘' },
  food_menu: { label: 'Food Menu', icon: '🍱' },
};

const SCENARIO_LABELS: Record<string, string> = {
  restaurant: '🍜 Restaurant',
  convenience_store: '🏪 Konbini',
  train: '🚃 Train',
  hotel: '🏨 Hotel',
  shopping: '🛍️ Shopping',
  emergency: '🆘 Emergency',
  greeting: '👋 Greeting',
  taxi: '🚕 Taxi',
};

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
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

function EventsSparkline({ data }: { data: { date: string; count: number }[] }) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const max = Math.max(...data.map((d) => d.count), 1);
  const barWidth = 100 / data.length;
  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    return (
      <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
        No travel events in the last 30 days
      </Typography>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', height: 60, gap: '1px' }}>
        {data.map((d) => (
          <Tooltip
            key={d.date}
            title={`${d.date}: ${d.count} event${d.count !== 1 ? 's' : ''}`}
            arrow
          >
            <Box
              sx={{
                width: `${barWidth}%`,
                height: `${Math.max((d.count / max) * 100, d.count > 0 ? 8 : 2)}%`,
                bgcolor: d.count > 0 ? brand[400] : alpha(brand[200], 0.3),
                borderRadius: '2px 2px 0 0',
                transition: 'height 0.2s',
                '&:hover': { bgcolor: brand[600] },
              }}
            />
          </Tooltip>
        ))}
      </Box>
      <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
        <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
          {data[0]?.date.slice(5)}
        </Typography>
        <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
          {data[data.length - 1]?.date.slice(5)}
        </Typography>
      </Stack>
    </Box>
  );
}

function formatRelativeTime(dateStr: string | null) {
  if (!dateStr) return '—';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface TravelAnalyticsProps {
  data: TravelAnalyticsData;
  tablePaperSx: SxProps<Theme>;
  headerCellSx: SxProps<Theme>;
  bodyCellSx: SxProps<Theme>;
}

export function TravelAnalytics({
  data,
  tablePaperSx,
  headerCellSx,
  bodyCellSx,
}: TravelAnalyticsProps) {
  const theme = useTheme();
  const { brand } = theme.palette;

  if (data.overview.totalEvents === 0) {
    return (
      <>
        <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2 }}>
          <ExploreIcon sx={{ color: brand[500] }} />
          <Typography
            sx={{
              fontFamily: (t) => t.fonts.cute,
              fontWeight: 600,
              fontSize: '1.2rem',
              color: brand[700],
            }}
          >
            Travel Analytics
          </Typography>
        </Stack>
        <Paper sx={{ ...tablePaperSx, p: 3, textAlign: 'center' } as SxProps<Theme>}>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.88rem' }}>
            No travel usage data yet. Events will appear as users interact with travel features.
          </Typography>
        </Paper>
      </>
    );
  }

  return (
    <>
      {/* Section header */}
      <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2 }}>
        <ExploreIcon sx={{ color: brand[500] }} />
        <Typography
          sx={{
            fontFamily: (t) => t.fonts.cute,
            fontWeight: 600,
            fontSize: '1.2rem',
            color: brand[700],
          }}
        >
          Travel Analytics
        </Typography>
      </Stack>

      {/* Overview stat cards */}
      <Stack direction="row" flexWrap="wrap" gap={2} sx={{ mb: 3 }}>
        <StatCard icon={<TouchAppIcon />} label="Total Events" value={data.overview.totalEvents} />
        <StatCard icon={<PeopleIcon />} label="Unique Users" value={data.overview.uniqueUsers} />
        <StatCard
          icon={<TimelineIcon />}
          label="Features Used"
          value={data.featureBreakdown.length}
        />
      </Stack>

      {/* Events over time */}
      <Paper sx={{ ...tablePaperSx, p: 2.5, mb: 3 } as SxProps<Theme>}>
        <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1.5 }}>
          <TrendingUpIcon sx={{ color: brand[500], fontSize: '1.1rem' }} />
          <Typography
            sx={{
              fontFamily: (t) => t.fonts.cute,
              fontWeight: 600,
              fontSize: '0.92rem',
              color: brand[700],
            }}
          >
            Travel Events — Last 30 Days
          </Typography>
        </Stack>
        <EventsSparkline data={data.eventsOverTime} />
      </Paper>

      {/* Feature breakdown */}
      <Paper sx={{ ...tablePaperSx, p: 2.5, mb: 3 } as SxProps<Theme>}>
        <Typography
          sx={{
            fontFamily: (t) => t.fonts.cute,
            fontWeight: 600,
            fontSize: '0.92rem',
            color: brand[700],
            mb: 1.5,
          }}
        >
          Feature Popularity
        </Typography>
        <Stack gap={1}>
          {data.featureBreakdown.map((f) => {
            const maxCount = data.featureBreakdown[0].count;
            const info = FEATURE_LABELS[f.feature] ?? { label: f.feature, icon: '📦' };
            return (
              <Box key={f.feature}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.25 }}>
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 500 }}>
                    {info.icon} {info.label}
                  </Typography>
                  <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                    {f.count} event{f.count !== 1 ? 's' : ''}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={(f.count / maxCount) * 100}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    bgcolor: alpha(brand[100], 0.4),
                    '& .MuiLinearProgress-bar': { bgcolor: brand[400], borderRadius: 3 },
                  }}
                />
              </Box>
            );
          })}
        </Stack>
      </Paper>

      {/* Scenario category breakdown */}
      {data.scenarioBreakdown.length > 0 && (
        <Paper sx={{ ...tablePaperSx, p: 2.5, mb: 3 } as SxProps<Theme>}>
          <Typography
            sx={{
              fontFamily: (t) => t.fonts.cute,
              fontWeight: 600,
              fontSize: '0.92rem',
              color: brand[700],
              mb: 1.5,
            }}
          >
            Scenario Categories
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {data.scenarioBreakdown.map((s) => (
              <Chip
                key={s.category}
                label={`${SCENARIO_LABELS[s.category] ?? s.category} (${s.count})`}
                size="small"
                sx={{
                  fontSize: '0.78rem',
                  bgcolor: alpha(brand[100], 0.5),
                  color: brand[700],
                  fontWeight: 500,
                }}
              />
            ))}
          </Stack>
        </Paper>
      )}

      {/* Per-user travel table */}
      {data.users.length > 0 && (
        <>
          <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1.5 }}>
            <GroupIcon sx={{ color: brand[500], fontSize: '1.1rem' }} />
            <Typography
              sx={{
                fontFamily: (t) => t.fonts.cute,
                fontWeight: 600,
                fontSize: '0.92rem',
                color: brand[700],
              }}
            >
              Travel Users ({data.users.length})
            </Typography>
          </Stack>
          <TableContainer component={Paper} sx={{ ...tablePaperSx, mb: 4 } as SxProps<Theme>}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={headerCellSx}>User</TableCell>
                  <TableCell sx={headerCellSx} align="center">
                    Events
                  </TableCell>
                  <TableCell sx={headerCellSx} align="center">
                    Features
                  </TableCell>
                  <TableCell sx={headerCellSx}>Last Active</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.users.map((u) => (
                  <TableRow key={u.userId} hover>
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
                      {u.totalEvents}
                    </TableCell>
                    <TableCell sx={bodyCellSx} align="center">
                      <Chip
                        label={`${u.featuresUsed} / ${Object.keys(FEATURE_LABELS).length}`}
                        size="small"
                        sx={{
                          fontSize: '0.7rem',
                          height: 22,
                          bgcolor:
                            u.featuresUsed >= 5
                              ? alpha(theme.palette.success.main, 0.15)
                              : u.featuresUsed >= 3
                                ? alpha(theme.palette.warning.main, 0.15)
                                : alpha(brand[100], 0.5),
                          color:
                            u.featuresUsed >= 5
                              ? theme.palette.success.dark
                              : u.featuresUsed >= 3
                                ? theme.palette.warning.dark
                                : brand[700],
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell
                      sx={{
                        ...bodyCellSx,
                        color: u.lastActiveAt
                          ? (() => {
                              const days = Math.floor(
                                (Date.now() - new Date(u.lastActiveAt).getTime()) / 86_400_000,
                              );
                              if (days <= 7) return 'success.main';
                              if (days <= 30) return 'warning.main';
                              return 'text.secondary';
                            })()
                          : 'text.secondary',
                        fontWeight: u.lastActiveAt ? 600 : 400,
                      }}
                    >
                      {formatRelativeTime(u.lastActiveAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </>
  );
}

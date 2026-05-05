'use client';

import BarChartIcon from '@mui/icons-material/BarChart';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import GroupIcon from '@mui/icons-material/Group';
import LanguageIcon from '@mui/icons-material/Language';
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

import type { EmbedAnalyticsData } from './types';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}

function StatCard({ icon, label, value }: StatCardProps) {
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

function formatDuration(seconds: number | null) {
  if (seconds == null) return '—';
  if (seconds >= 60) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Tiny inline bar chart for sessions over time (last 30 days). */
function SessionsSparkline({ data }: { data: { date: string; sessions: number }[] }) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const max = Math.max(...data.map((d) => d.sessions), 1);
  const barWidth = 100 / data.length;
  const total = data.reduce((sum, d) => sum + d.sessions, 0);

  if (total === 0) {
    return (
      <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
        No sessions in the last 30 days
      </Typography>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', height: 60, gap: '1px' }}>
        {data.map((d) => (
          <Tooltip
            key={d.date}
            title={`${d.date}: ${d.sessions} session${d.sessions !== 1 ? 's' : ''}`}
            arrow
          >
            <Box
              sx={{
                width: `${barWidth}%`,
                height: `${Math.max((d.sessions / max) * 100, d.sessions > 0 ? 8 : 2)}%`,
                bgcolor: d.sessions > 0 ? brand[400] : alpha(brand[200], 0.3),
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

/** Card difficulty mini-bars for a single deck. */
function CardDifficultyBars({
  difficulty,
  totalCards,
}: {
  difficulty: { cardIndex: number; flips: number }[];
  totalCards: number;
}) {
  const theme = useTheme();
  const { brand } = theme.palette;
  if (difficulty.length === 0)
    return <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>—</Typography>;

  const max = Math.max(...difficulty.map((d) => d.flips), 1);
  const slots = Math.max(totalCards, ...difficulty.map((d) => d.cardIndex + 1));
  const flipMap = new Map(difficulty.map((d) => [d.cardIndex, d.flips]));

  return (
    <Tooltip
      title={
        <Box>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, mb: 0.5 }}>
            Flips per card position
          </Typography>
          {difficulty.slice(0, 5).map((d) => (
            <Typography key={d.cardIndex} sx={{ fontSize: '0.7rem' }}>
              Card {d.cardIndex + 1}: {d.flips} flip{d.flips !== 1 ? 's' : ''}
            </Typography>
          ))}
        </Box>
      }
      arrow
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-end', height: 24, gap: '1px', minWidth: 60 }}>
        {Array.from({ length: Math.min(slots, 20) }, (_, i) => {
          const flips = flipMap.get(i) ?? 0;
          const pct = (flips / max) * 100;
          return (
            <Box
              key={i}
              sx={{
                flex: 1,
                height: `${Math.max(pct, flips > 0 ? 12 : 4)}%`,
                bgcolor:
                  flips > 0 ? alpha(brand[500], 0.3 + 0.7 * (flips / max)) : alpha(brand[200], 0.2),
                borderRadius: '1px 1px 0 0',
              }}
            />
          );
        })}
      </Box>
    </Tooltip>
  );
}

interface EmbedAnalyticsProps {
  data: EmbedAnalyticsData;
  tablePaperSx: SxProps<Theme>;
  headerCellSx: SxProps<Theme>;
  bodyCellSx: SxProps<Theme>;
}

export function EmbedAnalytics({
  data,
  tablePaperSx,
  headerCellSx,
  bodyCellSx,
}: EmbedAnalyticsProps) {
  const theme = useTheme();
  const { brand } = theme.palette;

  return (
    <>
      {/* Section header */}
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

      {/* Overview stat cards */}
      <Stack direction="row" flexWrap="wrap" gap={2} sx={{ mb: 3 }}>
        <StatCard icon={<GroupIcon />} label="Total Sessions" value={data.overview.totalSessions} />
        <StatCard
          icon={<EmojiEventsIcon />}
          label="Completions"
          value={data.overview.totalCompletions}
        />
      </Stack>

      {/* Sessions over time */}
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
            Sessions — Last 30 Days
          </Typography>
        </Stack>
        <SessionsSparkline data={data.sessionsOverTime} />
      </Paper>

      {/* Referrer breakdown */}
      {data.referrers.length > 0 && (
        <Paper sx={{ ...tablePaperSx, p: 2.5, mb: 3 } as SxProps<Theme>}>
          <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1.5 }}>
            <LanguageIcon sx={{ color: brand[500], fontSize: '1.1rem' }} />
            <Typography
              sx={{
                fontFamily: (t) => t.fonts.cute,
                fontWeight: 600,
                fontSize: '0.92rem',
                color: brand[700],
              }}
            >
              Traffic Sources
            </Typography>
          </Stack>
          <Stack gap={1}>
            {data.referrers.slice(0, 10).map((r) => {
              const maxSessions = data.referrers[0].sessions;
              return (
                <Box key={r.source}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.25 }}>
                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 500 }}>
                      {r.source}
                    </Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                      {r.sessions} session{r.sessions !== 1 ? 's' : ''}
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={(r.sessions / maxSessions) * 100}
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
      )}

      {/* Per-deck table */}
      {data.decks.length === 0 ? (
        <Paper sx={{ ...tablePaperSx, p: 3, textAlign: 'center', mb: 4 } as SxProps<Theme>}>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.88rem' }}>
            No embed sessions yet. Share a public deck&apos;s embed link to start collecting data.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ ...tablePaperSx, mb: 4 } as SxProps<Theme>}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={headerCellSx}>Deck</TableCell>
                <TableCell sx={headerCellSx} align="center">
                  Sessions
                </TableCell>
                <TableCell sx={headerCellSx} align="center">
                  <Tooltip title="Percentage of sessions where the user viewed every card" arrow>
                    <span>Completion %</span>
                  </Tooltip>
                </TableCell>
                <TableCell sx={headerCellSx} align="center">
                  <Tooltip title="Average number of cards viewed per session" arrow>
                    <span>Avg Cards</span>
                  </Tooltip>
                </TableCell>
                <TableCell sx={headerCellSx} align="center">
                  Avg Duration
                </TableCell>
                <TableCell sx={headerCellSx} align="center">
                  <Tooltip
                    title="Card position where most users stop (incomplete sessions only)"
                    arrow
                  >
                    <span>Drop-off</span>
                  </Tooltip>
                </TableCell>
                <TableCell sx={headerCellSx} align="center">
                  <Tooltip
                    title="Which card positions get the most flips — darker bars = more revisits"
                    arrow
                  >
                    <span>Card Activity</span>
                  </Tooltip>
                </TableCell>
                <TableCell sx={headerCellSx}>Last Viewed</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.decks.map((d) => (
                <TableRow key={d.deckId} hover>
                  <TableCell sx={bodyCellSx}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontSize: '1rem' }}>{d.deckEmoji}</Typography>
                      <Box>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.82rem' }}>
                          {d.deckName}
                        </Typography>
                        <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                          by {d.deckOwner}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={bodyCellSx} align="center">
                    {d.sessions}
                  </TableCell>
                  <TableCell sx={bodyCellSx} align="center">
                    {d.completionRate != null ? (
                      <Chip
                        label={`${d.completionRate}%`}
                        size="small"
                        sx={{
                          fontSize: '0.7rem',
                          height: 22,
                          bgcolor:
                            d.completionRate >= 50
                              ? alpha(theme.palette.success.main, 0.15)
                              : d.completionRate >= 20
                                ? alpha(theme.palette.warning.main, 0.15)
                                : alpha(theme.palette.error.main, 0.12),
                          color:
                            d.completionRate >= 50
                              ? theme.palette.success.dark
                              : d.completionRate >= 20
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
                    {d.avgCardsFlipped != null ? (
                      <Tooltip title={`${d.avgCardsFlipped} of ${d.totalCards} cards`} arrow>
                        <Typography component="span" sx={{ fontSize: '0.82rem' }}>
                          {d.avgCardsFlipped}
                          <Typography
                            component="span"
                            sx={{ fontSize: '0.7rem', color: 'text.secondary' }}
                          >
                            /{d.totalCards}
                          </Typography>
                        </Typography>
                      </Tooltip>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell sx={bodyCellSx} align="center">
                    {formatDuration(d.avgDurationSeconds)}
                  </TableCell>
                  <TableCell sx={bodyCellSx} align="center">
                    {d.topDropOffCard != null ? (
                      <Tooltip
                        title={`Most users stop at card ${d.topDropOffCard + 1} of ${d.totalCards}`}
                        arrow
                      >
                        <Chip
                          label={`Card ${d.topDropOffCard + 1}`}
                          size="small"
                          sx={{
                            fontSize: '0.7rem',
                            height: 22,
                            bgcolor: alpha(theme.palette.warning.main, 0.15),
                            color: theme.palette.warning.dark,
                          }}
                        />
                      </Tooltip>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell sx={bodyCellSx} align="center">
                    <CardDifficultyBars difficulty={d.cardDifficulty} totalCards={d.totalCards} />
                  </TableCell>
                  <TableCell sx={bodyCellSx}>{formatDate(d.lastViewedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  );
}

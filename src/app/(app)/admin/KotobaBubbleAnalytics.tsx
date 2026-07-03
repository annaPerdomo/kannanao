'use client';

import BubbleChartIcon from '@mui/icons-material/BubbleChart';
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
  Typography,
} from '@mui/material';
import { alpha, type SxProps, type Theme, useTheme } from '@mui/material/styles';

import type { KotobaBubbleAnalyticsData } from './types';

interface KotobaBubbleAnalyticsProps {
  data: KotobaBubbleAnalyticsData;
  tablePaperSx: SxProps<Theme>;
  headerCellSx: SxProps<Theme>;
  bodyCellSx: SxProps<Theme>;
}

export function KotobaBubbleAnalytics({
  data,
  tablePaperSx,
  headerCellSx,
  bodyCellSx,
}: KotobaBubbleAnalyticsProps) {
  const theme = useTheme();
  const { brand } = theme.palette;

  return (
    <>
      <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 2 }}>
        <BubbleChartIcon sx={{ color: brand[500] }} />
        <Typography
          sx={{
            fontFamily: (t) => t.fonts.cute,
            fontWeight: 600,
            fontSize: '1.2rem',
            color: brand[700],
          }}
        >
          Sentence Builder
        </Typography>
      </Stack>

      {/* Overview chips */}
      <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2.5 }}>
        <Chip
          label={`${data.overview.totalDecksWithContent} decks generated`}
          size="small"
          sx={{ fontWeight: 600 }}
        />
        <Chip
          label={`${data.overview.totalSentences} sentences`}
          size="small"
          sx={{ fontWeight: 600 }}
        />
        <Chip
          label={`${data.overview.totalSessions} play sessions`}
          size="small"
          sx={{ fontWeight: 600 }}
        />
        <Chip
          label={`${data.overview.totalXpEarned.toLocaleString()} XP earned`}
          size="small"
          sx={{ fontWeight: 600 }}
        />
        <Chip
          label={`${data.overview.totalMeaningPeeks} meaning peeks`}
          size="small"
          sx={{ fontWeight: 600 }}
        />
      </Stack>

      {/* Decks with generated content */}
      {data.decks.length > 0 && (
        <>
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'text.secondary', mb: 1 }}>
            Generated Content by Deck
          </Typography>
          <TableContainer component={Paper} sx={{ ...tablePaperSx, mb: 3 } as SxProps<Theme>}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={headerCellSx}>Deck</TableCell>
                  <TableCell sx={headerCellSx}>Owner</TableCell>
                  <TableCell sx={headerCellSx} align="center">
                    Sentences
                  </TableCell>
                  <TableCell sx={headerCellSx} align="center">
                    Questions
                  </TableCell>
                  <TableCell sx={headerCellSx} align="center">
                    Responses
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.decks.map((d) => (
                  <TableRow key={d.deckId} hover>
                    <TableCell sx={bodyCellSx}>{d.deckName}</TableCell>
                    <TableCell sx={bodyCellSx}>{d.deckOwner}</TableCell>
                    <TableCell sx={bodyCellSx} align="center">
                      {d.total}
                    </TableCell>
                    <TableCell sx={bodyCellSx} align="center">
                      {d.questions}
                    </TableCell>
                    <TableCell sx={bodyCellSx} align="center">
                      {d.responses}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Player stats */}
      {data.users.length > 0 && (
        <>
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'text.secondary', mb: 1 }}>
            Player Stats
          </Typography>
          <TableContainer component={Paper} sx={{ ...tablePaperSx, mb: 4 } as SxProps<Theme>}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={headerCellSx}>Player</TableCell>
                  <TableCell sx={headerCellSx} align="center">
                    Sessions
                  </TableCell>
                  <TableCell sx={headerCellSx} align="center">
                    Correct
                  </TableCell>
                  <TableCell sx={headerCellSx} align="center">
                    Accuracy
                  </TableCell>
                  <TableCell sx={headerCellSx} align="center">
                    XP
                  </TableCell>
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
                          <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                            @{u.username}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={bodyCellSx} align="center">
                      {u.totalSessions}
                    </TableCell>
                    <TableCell sx={bodyCellSx} align="center">
                      {u.totalCorrect} / {u.totalStudied}
                    </TableCell>
                    <TableCell sx={bodyCellSx} align="center">
                      {u.accuracy != null ? (
                        <Chip
                          label={`${u.accuracy}%`}
                          size="small"
                          sx={{
                            fontSize: '0.7rem',
                            height: 22,
                            fontWeight: 600,
                            bgcolor:
                              u.accuracy >= 80
                                ? alpha(theme.palette.success.main, 0.15)
                                : u.accuracy >= 50
                                  ? alpha(theme.palette.warning.main, 0.15)
                                  : alpha(theme.palette.error.main, 0.12),
                            color:
                              u.accuracy >= 80
                                ? theme.palette.success.dark
                                : u.accuracy >= 50
                                  ? theme.palette.warning.dark
                                  : theme.palette.error.dark,
                          }}
                        />
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell sx={bodyCellSx} align="center">
                      {u.totalXp.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {data.decks.length === 0 && data.users.length === 0 && (
        <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem', mb: 4 }}>
          No Sentence Builder activity yet.
        </Typography>
      )}
    </>
  );
}

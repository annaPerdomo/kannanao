'use client';

import CheckIcon from '@mui/icons-material/Check';
import { Box, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

import type { QuestNode } from '@/lib/quest';

interface QuestMapProps {
  nodes: QuestNode[];
  /** Index of the node currently being played. */
  currentIndex: number;
  /** Whether today's chest is still unopened (shows a bright chest at the end). */
  chestAvailable: boolean;
}

/**
 * The quest path: a short row of nodes with the chest at the finish line. The
 * current node is highlighted, finished nodes get a check, and the chest glows
 * while it's still there to win. Presentational only.
 */
export function QuestMap({ nodes, currentIndex, chestAvailable }: QuestMapProps) {
  const theme = useTheme();
  const { brand, accent } = theme.palette;
  if (nodes.length === 0) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        gap: 0.5,
        mb: 3,
        flexWrap: 'nowrap',
        overflowX: 'auto',
      }}
    >
      {nodes.map((node, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <Box key={node.type} sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <Box sx={{ textAlign: 'center', width: 76 }}>
              <Box
                sx={{
                  mx: 'auto',
                  width: 46,
                  height: 46,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  transition: 'all 0.2s',
                  border: active
                    ? `2px solid ${accent[500]}`
                    : `2px solid ${alpha(brand[300], 0.5)}`,
                  bgcolor: done
                    ? alpha(theme.palette.success.main, 0.15)
                    : active
                      ? alpha(accent[300], 0.25)
                      : alpha(brand[100], 0.5),
                  transform: active ? 'scale(1.08)' : 'scale(1)',
                }}
                aria-hidden
              >
                {done ? (
                  <CheckIcon sx={{ color: 'success.main' }} />
                ) : (
                  <Box component="span">{node.emoji}</Box>
                )}
              </Box>
              <Typography
                sx={{
                  mt: 0.5,
                  fontSize: '0.68rem',
                  fontWeight: active ? 800 : 600,
                  color: active ? 'text.primary' : 'text.secondary',
                  lineHeight: 1.2,
                }}
              >
                {node.label}
              </Typography>
            </Box>
            {/* Connector to the next node / chest */}
            <Box
              sx={{
                width: 18,
                height: 2,
                mt: '22px',
                borderRadius: 2,
                bgcolor: done ? theme.palette.success.main : alpha(brand[300], 0.5),
                flexShrink: 0,
              }}
            />
          </Box>
        );
      })}

      {/* Chest at the finish line */}
      <Box sx={{ textAlign: 'center', width: 60, flexShrink: 0 }}>
        <Box
          sx={{
            mx: 'auto',
            width: 46,
            height: 46,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
            border: `2px solid ${alpha(accent[400], chestAvailable ? 0.8 : 0.3)}`,
            bgcolor: chestAvailable ? alpha(accent[300], 0.3) : alpha(brand[100], 0.4),
            opacity: chestAvailable ? 1 : 0.5,
          }}
          aria-hidden
        >
          🎁
        </Box>
        <Typography sx={{ mt: 0.5, fontSize: '0.68rem', fontWeight: 600, color: 'text.secondary' }}>
          Chest
        </Typography>
      </Box>
    </Box>
  );
}

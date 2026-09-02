'use client';
import { Box, Stack, Tab, Tabs, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

import type { KanaTrack } from '@/lib/kanaCurriculum';
import { type KanaProgressMap, kanaStrengthState } from '@/lib/kanaProficiency';

import { buildKanaChart, CELL_WIDTH, CHART_DIRECTION, type ChartBlock } from './constants';
import { KanaChartCell } from './KanaChartCell';

const BLOCK_TITLES: Partial<Record<ChartBlock['id'], string>> = {
  marked: 'markedBlock',
  combo: 'comboBlock',
  contextual: 'contextualBlock',
};

interface KanaChartProps {
  track: KanaTrack;
  byKana: KanaProgressMap;
  onTrackChange: (track: KanaTrack) => void;
  onPlayRow: (setId: string) => void;
  onPlayKana: (kana: string) => void;
}

const HEADER_SX = {
  py: 0.5,
  borderRadius: 1.5,
  textAlign: 'center',
  fontSize: '0.8rem',
  fontWeight: 700,
  color: 'text.secondary',
} as const;

function ColumnHeader({ label, onClick }: { label: string; onClick: () => void }) {
  const t = useTranslations('KanaJourney.journey');
  return (
    <Box
      role="button"
      tabIndex={0}
      aria-label={t('rowLabel', { kana: label })}
      onClick={onClick}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      sx={{
        ...HEADER_SX,
        width: CELL_WIDTH,
        cursor: 'pointer',
        fontFamily: (th) => th.fonts.jp,
        bgcolor: (th) => alpha(th.palette.brand[300], 0.14),
        '&:hover': { bgcolor: (th) => alpha(th.palette.brand[300], 0.28) },
      }}
    >
      {label}
    </Box>
  );
}

function RowLabels({ labels }: { labels: readonly string[] }) {
  return (
    <Stack spacing={0.5} aria-hidden>
      <Box sx={{ ...HEADER_SX, visibility: 'hidden' }}>·</Box>
      {labels.map((label) => (
        <Box
          key={label}
          sx={{
            minHeight: { xs: 52, sm: 60 },
            px: 0.5,
            display: 'flex',
            alignItems: 'center',
            fontSize: '0.7rem',
            fontWeight: 700,
            color: 'text.secondary',
          }}
        >
          {label}
        </Box>
      ))}
    </Stack>
  );
}

function Block({
  block,
  byKana,
  onPlayRow,
  onPlayKana,
}: { block: ChartBlock } & Pick<KanaChartProps, 'byKana' | 'onPlayRow' | 'onPlayKana'>) {
  const t = useTranslations('KanaJourney.journey');
  const titleKey = BLOCK_TITLES[block.id];
  const bare = block.rowLabels.length === 0;

  return (
    // minWidth 0: as a flex item this block would otherwise grow to its content
    // and push the page itself sideways instead of scrolling inside the box.
    <Box sx={{ minWidth: 0 }}>
      {titleKey && (
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 700, color: 'text.primary', mb: 1, px: 0.5 }}
        >
          {t(titleKey)}
        </Typography>
      )}
      {/* Scrolls inside this box at every width: reflowing to a list on a
          phone brings back the layout the chart replaced. */}
      <Box
        // rtl orders the gojuon columns; a bare strip has no columns to order,
        // and would just print っ ー backwards.
        dir={bare ? 'ltr' : CHART_DIRECTION}
        sx={{ overflowX: 'auto', overflowY: 'hidden', pb: 1, mx: -0.5, px: 0.5 }}
      >
        <Stack direction="row" spacing={0.5} useFlexGap sx={{ width: 'max-content' }}>
          {bare ? (
            block.columns[0].cells.map((entry, i) => (
              <KanaChartCell
                key={entry?.kana ?? `bare-gap-${i}`}
                entry={entry}
                state={kanaStrengthState(entry ? byKana.get(entry.kana) : undefined)}
                onPlay={onPlayKana}
              />
            ))
          ) : (
            <RowLabels labels={block.rowLabels} />
          )}
          {!bare &&
            block.columns.map((col) => (
              <Stack key={`${col.setId}-${col.label}`} spacing={0.5}>
                <ColumnHeader label={col.label} onClick={() => onPlayRow(col.setId)} />
                {col.cells.map((entry, i) => (
                  <KanaChartCell
                    key={entry?.kana ?? `${col.label}-gap-${i}`}
                    entry={entry}
                    state={kanaStrengthState(entry ? byKana.get(entry.kana) : undefined)}
                    onPlay={onPlayKana}
                  />
                ))}
              </Stack>
            ))}
        </Stack>
      </Box>
    </Box>
  );
}

export function KanaChart({ track, byKana, onTrackChange, onPlayRow, onPlayKana }: KanaChartProps) {
  const t = useTranslations('KanaJourney.journey');
  const blocks = useMemo(() => buildKanaChart(track), [track]);

  return (
    <Box>
      <Tabs
        value={track}
        onChange={(_, value: KanaTrack) => onTrackChange(value)}
        variant="fullWidth"
        sx={{ mb: 2 }}
      >
        <Tab value="hiragana" label={t('hiraganaTrack')} />
        <Tab value="katakana" label={t('katakanaTrack')} />
      </Tabs>

      <Stack spacing={3}>
        {blocks.map((block) => (
          <Block
            key={block.id}
            block={block}
            byKana={byKana}
            onPlayRow={onPlayRow}
            onPlayKana={onPlayKana}
          />
        ))}
      </Stack>
    </Box>
  );
}

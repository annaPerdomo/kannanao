'use client';
import LocalFireDepartmentRoundedIcon from '@mui/icons-material/LocalFireDepartmentRounded';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useLocale, useTranslations } from 'next-intl';

interface TodoHeaderProps {
  view: 'week' | 'month';
  onViewChange: (view: 'week' | 'month') => void;
  streak: number;
  brandPalette: Record<number, string>;
  accentPalette: Record<number, string>;
}

/** The kanji each view is named after — a label in Japanese for an English UI. */
const VIEW_KANJI: Record<'week' | 'month', string> = { week: '週', month: '月' };

export function TodoHeader({
  view,
  onViewChange,
  streak,
  brandPalette: brand,
  accentPalette: accent,
}: TodoHeaderProps) {
  const t = useTranslations('Todo.todoHeader');
  const locale = useLocale();
  // In Japanese the button already reads 週 / 月, so the kanji chip would just
  // print the same character twice.
  const showKanji = !locale.startsWith('ja');

  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5} gap={1}>
      <Typography
        variant="h6"
        sx={{
          fontWeight: 800,
          // Small enough on phones that it doesn't ellipsise against the
          // streak chip and the Week/Month toggle sharing this row.
          fontSize: { xs: '0.92rem', sm: '1.12rem' },
          color: 'text.primary',
          lineHeight: 1.2,
          minWidth: 0,
        }}
        noWrap
      >
        {t('title')}
      </Typography>

      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ flexShrink: 0 }}>
        {streak > 0 && (
          <Chip
            icon={<LocalFireDepartmentRoundedIcon sx={{ fontSize: '0.85rem !important' }} />}
            label={`${streak}`}
            size="small"
            sx={{
              height: 24,
              fontWeight: 800,
              fontSize: '0.72rem',
              bgcolor: 'rgba(251,191,36,0.18)',
              color: '#B45309',
              border: '1.5px solid rgba(251,191,36,0.4)',
              '& .MuiChip-icon': { color: '#F59E0B' },
            }}
          />
        )}

        <Stack
          direction="row"
          spacing={0.25}
          sx={{
            background: alpha(brand[50], 0.85),
            borderRadius: '9px',
            p: '3px',
            border: `1.5px solid ${alpha(brand[200], 0.6)}`,
          }}
        >
          {(['week', 'month'] as const).map((v) => (
            <Box
              key={v}
              component="button"
              onClick={() => onViewChange(v)}
              aria-pressed={view === v}
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 0.5,
                px: 1.25,
                py: 0.5,
                borderRadius: '7px',
                border: 'none',
                // 600s, not the 400/300 pair this used to carry: white on the
                // lighter gradient sat around 2:1 and the active tab was the
                // hardest thing in the widget to read.
                background:
                  view === v
                    ? `linear-gradient(135deg, ${brand[600]}, ${accent[600]})`
                    : 'transparent',
                color: view === v ? 'white' : brand[600],
                boxShadow: view === v ? `0 2px 8px ${alpha(brand[600], 0.35)}` : 'none',
                fontFamily: (theme) => theme.fonts.cute,
                fontSize: '0.75rem',
                fontWeight: 900,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {showKanji && (
                <Box
                  component="span"
                  aria-hidden
                  sx={{
                    // Hidden on phones: the kanji is a flourish, and the row it
                    // shares with the title and the streak chip has no width to
                    // spare — keeping it there ellipsises the heading.
                    display: { xs: 'none', sm: 'inline' },
                    fontSize: '0.82rem',
                    fontWeight: 700,
                  }}
                >
                  {VIEW_KANJI[v]}
                </Box>
              )}
              <span>{v === 'week' ? t('weekView') : t('monthView')}</span>
            </Box>
          ))}
        </Stack>
      </Stack>
    </Stack>
  );
}

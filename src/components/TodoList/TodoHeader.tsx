'use client';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import LocalFireDepartmentRoundedIcon from '@mui/icons-material/LocalFireDepartmentRounded';
import ViewWeekRoundedIcon from '@mui/icons-material/ViewWeekRounded';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { useTranslations } from 'next-intl';

interface TodoHeaderProps {
  view: 'week' | 'month';
  onViewChange: (view: 'week' | 'month') => void;
  streak: number;
  brandPalette: Record<number, string>;
  accentPalette: Record<number, string>;
}

export function TodoHeader({
  view,
  onViewChange,
  streak,
  brandPalette: brand,
  accentPalette: accent,
}: TodoHeaderProps) {
  const t = useTranslations('Todo.todoHeader');
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.25}>
      <Stack direction="row" alignItems="center" spacing={0.75}>
        <Typography sx={{ fontSize: '1.15rem' }}>🌸</Typography>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 800,
            fontSize: { xs: '0.95rem', sm: '1.05rem' },
            background: `linear-gradient(90deg, ${brand[700]} 0%, ${accent[500]} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {t('title')}
        </Typography>
        <Typography sx={{ fontSize: '0.85rem' }}>✨</Typography>
      </Stack>

      <Stack direction="row" alignItems="center" spacing={0.75}>
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
            background: alpha(brand[100], 0.5),
            borderRadius: 2.5,
            p: 0.25,
            border: `1.5px solid ${alpha(brand[200], 0.35)}`,
          }}
        >
          {(['week', 'month'] as const).map((v) => (
            <Box
              key={v}
              component="button"
              onClick={() => onViewChange(v)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.35,
                px: 1,
                py: 0.4,
                borderRadius: 2,
                border: 'none',
                background:
                  view === v
                    ? `linear-gradient(135deg, ${brand[400]}, ${accent[300]})`
                    : 'transparent',
                color: view === v ? 'white' : brand[500],
                fontFamily: (t) => t.fonts.cute,
                fontSize: '0.68rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {v === 'week' ? (
                <ViewWeekRoundedIcon sx={{ fontSize: '0.82rem' }} />
              ) : (
                <CalendarMonthRoundedIcon sx={{ fontSize: '0.82rem' }} />
              )}
              <span>{v === 'week' ? t('weekView') : t('monthView')}</span>
            </Box>
          ))}
        </Stack>
      </Stack>
    </Stack>
  );
}

'use client';
import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useTranslations } from 'next-intl';

import type {
  BinderFilters as Filters,
  BinderSort,
  StrengthFilter,
  TypeFilter,
} from '@/lib/binder';
import type { JlptLevel } from '@/types/flashcard';

const STRENGTHS: StrengthFilter[] = ['all', 'strong', 'learning', 'new'];
const STRENGTH_EMOJI: Record<StrengthFilter, string> = {
  all: '🗂️',
  strong: '⭐',
  learning: '🌱',
  new: '❔',
};
const SORTS: BinderSort[] = ['lesson', 'strongest', 'weakest', 'newest', 'missed', 'reading'];

interface BinderFiltersProps {
  filters: Filters;
  onChange: (next: Filters) => void;
  levels: JlptLevel[];
  phrases: boolean;
}

function ChipRow<T extends string>({
  values,
  value,
  label,
  onPick,
  ariaLabel,
}: {
  values: T[];
  value: T;
  label: (v: T) => string;
  onPick: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <Box
      role="group"
      aria-label={ariaLabel}
      sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}
    >
      {values.map((v) => (
        <Chip
          key={v}
          label={label(v)}
          onClick={() => onPick(v)}
          color={v === value ? 'primary' : 'default'}
          variant={v === value ? 'filled' : 'outlined'}
          aria-pressed={v === value}
          sx={{ fontWeight: 700 }}
        />
      ))}
    </Box>
  );
}

export function BinderFilters({ filters, onChange, levels, phrases }: BinderFiltersProps) {
  const t = useTranslations('Binder.filters');
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({ ...filters, [key]: value });

  return (
    <Stack spacing={1.25}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
        <TextField
          size="small"
          fullWidth
          value={filters.query}
          onChange={(e) => set('query', e.target.value)}
          placeholder={t('searchPlaceholder')}
          inputProps={{ 'aria-label': t('searchAria') }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <TextField
          select
          size="small"
          value={filters.sort}
          onChange={(e) => set('sort', e.target.value as BinderSort)}
          label={t('sortLabel')}
          sx={{ minWidth: { sm: 200 } }}
        >
          {SORTS.map((s) => (
            <MenuItem key={s} value={s}>
              {t(`sort.${s}`)}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <ChipRow
        values={STRENGTHS}
        value={filters.strength}
        label={(v) => `${STRENGTH_EMOJI[v]} ${t(`strength.${v}`)}`}
        onPick={(v) => set('strength', v)}
        ariaLabel={t('strengthAria')}
      />

      {(levels.length > 0 || phrases) && (
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {levels.length > 0 && (
            <ChipRow<JlptLevel | 'all'>
              values={['all', ...levels]}
              value={filters.jlpt}
              label={(v) => (v === 'all' ? t('anyLevel') : v)}
              onPick={(v) => set('jlpt', v)}
              ariaLabel={t('levelAria')}
            />
          )}
          {phrases && (
            <ChipRow<TypeFilter>
              values={['all', 'word', 'phrase']}
              value={filters.type}
              label={(v) => t(`type.${v}`)}
              onPick={(v) => set('type', v)}
              ariaLabel={t('typeAria')}
            />
          )}
        </Box>
      )}
    </Stack>
  );
}

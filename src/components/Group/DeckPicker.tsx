'use client';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';

interface DeckPickerProps {
  decks: { id: string; name: string; emoji?: string | null }[];
  /** Empty string shows the placeholder. */
  value: string;
  onChange: (deckId: string) => void;
}

export function DeckPicker({ decks, value, onChange }: DeckPickerProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const t = useTranslations('Group.deckPicker');

  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      displayEmpty
      size="small"
      fullWidth
      aria-label={t('ariaLabel')}
      sx={{
        mb: 1.5,
        borderRadius: theme.radii.sm,
        fontSize: '0.85rem',
        fontWeight: 600,
        color: 'text.primary',
        bgcolor: alpha(brand[50], 0.7),
        '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha(brand[400], 0.4) },
      }}
    >
      <MenuItem value="" disabled>
        {t('placeholder')}
      </MenuItem>
      {decks.map((d) => (
        <MenuItem key={d.id} value={d.id} sx={{ fontSize: '0.85rem' }}>
          {d.emoji || '📚'} {d.name}
        </MenuItem>
      ))}
    </Select>
  );
}

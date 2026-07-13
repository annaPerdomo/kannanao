import { alpha, type Theme } from '@mui/material/styles';

import type { Flashcard, JlptLevel } from '@/types/flashcard';

export type EditableFields = Pick<
  Flashcard,
  'word' | 'reading' | 'meaning' | 'example_jp' | 'example_en' | 'imageUrl' | 'image_query'
>;

export const JLPT_LEVELS: JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

export const FIELD_CONFIG: {
  key: keyof EditableFields;
  labelKey: string;
  placeholderKey: string;
  multiline?: boolean;
  rows?: number;
  helperTextKey?: string;
}[] = [
  {
    key: 'word',
    labelKey: 'word.label',
    placeholderKey: 'word.placeholder',
    helperTextKey: 'word.helperText',
  },
  {
    key: 'reading',
    labelKey: 'reading.label',
    placeholderKey: 'reading.placeholder',
    helperTextKey: 'reading.helperText',
  },
  {
    key: 'meaning',
    labelKey: 'meaning.label',
    placeholderKey: 'meaning.placeholder',
    helperTextKey: 'meaning.helperText',
  },
  {
    key: 'example_jp',
    labelKey: 'exampleJp.label',
    placeholderKey: 'exampleJp.placeholder',
    multiline: true,
    rows: 2,
    helperTextKey: 'exampleJp.helperText',
  },
  {
    key: 'example_en',
    labelKey: 'exampleEn.label',
    placeholderKey: 'exampleEn.placeholder',
    multiline: true,
    rows: 2,
    helperTextKey: 'exampleEn.helperText',
  },
];

export const sharedTextFieldSx = (theme: Theme) =>
  ({
    '& .MuiOutlinedInput-root': {
      borderRadius: '10px',
      fontSize: '0.875rem',
      '& fieldset': { borderColor: alpha(theme.palette.brand[300], 0.4) },
      '&:hover fieldset': { borderColor: theme.palette.brand[400] },
      '&.Mui-focused fieldset': { borderColor: theme.palette.brand[500], borderWidth: '1.5px' },
    },
    '& .MuiInputLabel-root': {
      fontSize: '0.8rem',
      color: theme.palette.brand[700],
      '&.Mui-focused': { color: theme.palette.brand[500] },
    },
    '& .MuiFormHelperText-root': {
      fontSize: '0.68rem',
      color: alpha(theme.palette.brand[700], 0.6),
    },
  }) as const;

export const toggleGroupSx = (theme: Theme) =>
  ({
    flexShrink: 0,
    '& .MuiToggleButton-root': {
      px: 1.75,
      py: 0.6,
      fontWeight: 800,
      fontSize: '0.78rem',
      lineHeight: 1,
      border: `1.5px solid ${alpha(theme.palette.brand[300], 0.45)}`,
      color: alpha(theme.palette.brand[700], 0.6),
      transition: 'all 0.18s ease',
      '&.Mui-selected': {
        background: `linear-gradient(90deg, ${alpha(theme.palette.brand[100], 0.8)}, ${alpha(theme.palette.accent[100], 0.8)})`,
        color: theme.palette.brand[700],
        borderColor: alpha(theme.palette.brand[300], 0.7),
        boxShadow: `0 2px 8px ${alpha(theme.palette.brand[300], 0.25)}`,
      },
      '&:hover:not(.Mui-selected)': { bgcolor: alpha(theme.palette.brand[300], 0.08) },
    },
  }) as const;

export const settingsRowSx = (theme: Theme) =>
  ({
    borderRadius: '12px',
    border: `1.5px solid ${alpha(theme.palette.brand[300], 0.35)}`,
    background: `linear-gradient(135deg, ${theme.palette.brand[50]} 0%, ${alpha(theme.palette.accent[50], 0.6)} 100%)`,
    p: '12px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
  }) as const;

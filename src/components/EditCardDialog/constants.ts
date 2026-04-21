import { alpha, type Theme } from '@mui/material/styles';
import type { Flashcard, JlptLevel } from '@/types/flashcard';

export type EditableFields = Pick<Flashcard, 'word' | 'reading' | 'meaning' | 'example_jp' | 'example_en' | 'imageUrl'>;

export const JLPT_LEVELS: JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

export const FIELD_CONFIG: {
  key: keyof EditableFields;
  label: string;
  placeholder: string;
  multiline?: boolean;
  rows?: number;
  helperText?: string;
}[] = [
  { key: 'word', label: '日本語 (Japanese Word)', placeholder: 'e.g. 猫', helperText: 'The Japanese word or phrase (kanji)' },
  { key: 'reading', label: 'Reading (Furigana)', placeholder: 'e.g. ねこ', helperText: 'Hiragana/katakana reading' },
  { key: 'meaning', label: 'Meaning (English)', placeholder: 'e.g. cat', helperText: 'English translation' },
  { key: 'example_jp', label: 'Example Sentence (JP)', placeholder: 'e.g. 猫が好きです。', multiline: true, rows: 2, helperText: 'Japanese example sentence' },
  { key: 'example_en', label: 'Example Sentence (EN)', placeholder: 'e.g. I like cats.', multiline: true, rows: 2, helperText: 'English translation of example' },
];

export const sharedTextFieldSx = (theme: Theme) => ({
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
} as const);

export const toggleGroupSx = (theme: Theme) => ({
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
} as const);

export const settingsRowSx = (theme: Theme) => ({
  borderRadius: '12px',
  border: `1.5px solid ${alpha(theme.palette.brand[300], 0.35)}`,
  background: `linear-gradient(135deg, ${theme.palette.brand[50]} 0%, ${alpha(theme.palette.accent[50], 0.6)} 100%)`,
  p: '12px 14px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 2,
} as const);

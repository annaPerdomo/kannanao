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

export const sharedTextFieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px',
        fontSize: '0.875rem',
    '& fieldset': { borderColor: 'rgba(249,168,212,0.4)' },
    '&:hover fieldset': { borderColor: '#F472B6' },
    '&.Mui-focused fieldset': { borderColor: '#EC4899', borderWidth: '1.5px' },
  },
  '& .MuiInputLabel-root': {
        fontSize: '0.8rem',
    color: '#BE185D',
    '&.Mui-focused': { color: '#EC4899' },
  },
  '& .MuiFormHelperText-root': {
        fontSize: '0.68rem',
    color: '#C2709A',
  },
} as const;

export const toggleGroupSx = {
  flexShrink: 0,
  '& .MuiToggleButton-root': {
    px: 1.75,
    py: 0.6,
    fontWeight: 800,
    fontSize: '0.78rem',
        lineHeight: 1,
    border: '1.5px solid rgba(249,168,212,0.45)',
    color: '#C2709A',
    transition: 'all 0.18s ease',
    '&.Mui-selected': {
      background: 'linear-gradient(90deg, #fce7f3, #ede9fe)',
      color: '#BE185D',
      borderColor: 'rgba(249,168,212,0.7)',
      boxShadow: '0 2px 8px rgba(249,168,212,0.25)',
    },
    '&:hover:not(.Mui-selected)': { bgcolor: 'rgba(249,168,212,0.08)' },
  },
} as const;

export const settingsRowSx = {
  borderRadius: '12px',
  border: '1.5px solid rgba(249,168,212,0.35)',
  background: 'linear-gradient(135deg, #FFF5FB 0%, #FAF5FF 100%)',
  p: '12px 14px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 2,
} as const;

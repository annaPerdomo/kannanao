export type AddSource = 'lesson' | 'decks' | 'quizlet' | 'kana' | 'blank';

interface AddSourceConfig {
  key: AddSource;
  glyph: string;
  /** Rainbow scale step — keeps every tile on-theme across all 12 color schemes. */
  colorKey: 50 | 100 | 200 | 300 | 400;
}

export const ADD_SOURCES: AddSourceConfig[] = [
  { key: 'lesson', glyph: '作', colorKey: 50 },
  { key: 'decks', glyph: '帳', colorKey: 100 },
  { key: 'quizlet', glyph: '移', colorKey: 200 },
  { key: 'kana', glyph: 'あ', colorKey: 300 },
  { key: 'blank', glyph: '新', colorKey: 400 },
];

export const ADD_SOURCE_ROUTES = [
  'lesson',
  'kana',
  'quizlet',
  'blank',
] as const satisfies readonly AddSource[];

export function isAddSource(value: string): value is (typeof ADD_SOURCE_ROUTES)[number] {
  return (ADD_SOURCE_ROUTES as readonly string[]).includes(value);
}

export type AddToPlanDestination = { openAssign: true } | { path: string };

/** `decks` reuses the existing assign dialog in place; every other source gets its own page. */
export function addToPlanDestination(groupId: string, source: AddSource): AddToPlanDestination {
  if (source === 'decks') return { openAssign: true };
  return { path: `/group/${groupId}/add/${source}` };
}

export type AddSource = 'lesson' | 'decks' | 'quizlet' | 'kana' | 'blank';

export const ADD_SOURCE_ROUTES = [
  'lesson',
  'kana',
  'quizlet',
  'blank',
] as const satisfies readonly AddSource[];

export function isAddSource(value: string): value is (typeof ADD_SOURCE_ROUTES)[number] {
  return (ADD_SOURCE_ROUTES as readonly string[]).includes(value);
}

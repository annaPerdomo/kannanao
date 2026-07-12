export type Screen = 'home' | 'deck' | 'study' | 'practice';

export type PracticeMode = 'match' | 'fill' | 'recall' | 'kotoba-bubble' | 'quiz';

export interface AppState {
  screen: Screen;
  activeDeckId: string | null;
  practiceMode: PracticeMode | null;
}

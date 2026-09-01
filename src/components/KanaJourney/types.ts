export interface KanaDrillProps {
  setId: string;
  chars: string[];
  onAnswer: (kana: string, correct: boolean) => void;
  onComplete: () => void;
  /** Decoy pool; defaults to this set plus the earlier sets of its track. */
  unlocked?: string[];
}

export interface KanaDrillProps {
  chars: string[];
  onAnswer: (kana: string, correct: boolean) => void;
  onComplete: () => void;
  decoyPool?: string[];
}

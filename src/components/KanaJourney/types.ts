export interface KanaDrillProps {
  chars: string[];
  onAnswer: (kana: string | string[], correct: boolean) => void;
  onComplete: () => void;
  decoyPool?: string[];
}

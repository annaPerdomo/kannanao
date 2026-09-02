export interface MatchPair {
  /** Unique within a round. */
  key: string;
  left: string;
  right: string;
  /** Curated reading for the tile's read-aloud button; omit for no button. */
  leftSpeak?: string;
  rightSpeak?: string;
}

export interface MatchTile<P extends MatchPair = MatchPair> {
  pair: P;
  side: 'left' | 'right';
}

/**
 * `miss` names both tiles that were brought together, for a caller that scores
 * individual characters: あ against イ says nothing about い or ア.
 */
export type MatchPairGradeFn<P extends MatchPair = MatchPair> = (
  correct: boolean,
  pair: P | undefined,
  miss?: { selected: MatchTile<P>; clicked: MatchTile<P> },
) => void;

export interface MatchRoundProgress {
  /** 0-based. */
  index: number;
  total: number;
}

/** 'japanese' sizes both columns as script; 'meaning' pairs Japanese against a gloss. */
export type MatchBoardVariant = 'meaning' | 'japanese';

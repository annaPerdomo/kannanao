export interface Ohanashikai {
  id: string;
  userId: string;
  title: string;
  description?: string;
  lineCount: number;
  createdAt: number;
  pinned?: boolean;
  /**
   * The speech's opening line, in `{kanji|reading}` furigana markup — what the
   * home row shows so a pinned speech is recognisable by its words rather than
   * by its title alone. Absent for a speech with no lines yet.
   */
  firstLine?: string;
}

export interface OhanashikaiLine {
  id: string;
  ohanashikaiId: string;
  text: string;
  orderIndex: number;
}

export type OhanashikaiPracticeMode = 'readthrough' | 'linerecall';

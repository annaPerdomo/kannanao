export interface Ohanashikai {
  id: string;
  userId: string;
  title: string;
  description?: string;
  lineCount: number;
  createdAt: number;
  pinned?: boolean;
}

export interface OhanashikaiLine {
  id: string;
  ohanashikaiId: string;
  text: string;
  orderIndex: number;
}

export type OhanashikaiPracticeMode = 'readthrough' | 'linerecall';

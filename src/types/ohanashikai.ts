export interface Ohanashikai {
  id: string;
  userId: string;
  title: string;
  description?: string;
  lineCount: number;
  createdAt: number;
}

export interface OhanashikaiLine {
  id: string;
  ohanashikaiId: string;
  text: string;
  orderIndex: number;
}

export type OhanashikaiPracticeMode = 'readthrough' | 'linerecall';

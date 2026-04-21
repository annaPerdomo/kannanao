import type { OhanashikaiPracticeMode } from '@/types/ohanashikai';

export interface SpeechPracticeTileConfig {
  mode: OhanashikaiPracticeMode;
  label: string;
  description: string;
  emoji: string;
  watermark: string;
  useBrand: boolean;
}

export const PRACTICE_CONFIG: SpeechPracticeTileConfig[] = [
  {
    mode: 'readthrough',
    label: 'Read Through',
    description: 'Read every line in order',
    emoji: '📖',
    watermark: '読',
    useBrand: false,
  },
  {
    mode: 'linerecall',
    label: 'Line Recall',
    description: 'Type each line from memory',
    emoji: '🎯',
    watermark: '暗',
    useBrand: true,
  },
];

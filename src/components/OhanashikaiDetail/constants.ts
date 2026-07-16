import type { OhanashikaiPracticeMode } from '@/types/ohanashikai';

export interface SpeechPracticeTileConfig {
  mode: OhanashikaiPracticeMode;
  labelKey: string;
  descriptionKey: string;
  emoji: string;
  watermark: string;
  useBrand: boolean;
}

// labelKey/descriptionKey are looked up in the Ohanashikai.practiceTiles translation namespace.
export const PRACTICE_CONFIG: SpeechPracticeTileConfig[] = [
  {
    mode: 'readthrough',
    labelKey: 'readthrough.label',
    descriptionKey: 'readthrough.description',
    emoji: '📖',
    watermark: '読',
    useBrand: false,
  },
  {
    mode: 'linerecall',
    labelKey: 'linerecall.label',
    descriptionKey: 'linerecall.description',
    emoji: '🎯',
    watermark: '暗',
    useBrand: true,
  },
];

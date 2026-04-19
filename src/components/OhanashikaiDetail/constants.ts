import type { OhanashikaiPracticeMode } from '@/types/ohanashikai';

export interface SpeechPracticeTileConfig {
  mode: OhanashikaiPracticeMode;
  label: string;
  description: string;
  emoji: string;
  watermark: string;
  color: string;
  bg: string;
  border: string;
  shadowColor: string;
}

export const PRACTICE_CONFIG: SpeechPracticeTileConfig[] = [
  {
    mode: 'readthrough',
    label: 'Read Through',
    description: 'Read every line in order',
    emoji: '📖',
    watermark: '読',
    color: '#7C3AED',
    bg: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
    border: 'rgba(196,181,253,0.7)',
    shadowColor: 'rgba(124,58,237,0.22)',
  },
  {
    mode: 'linerecall',
    label: 'Line Recall',
    description: 'Type each line from memory',
    emoji: '🎯',
    watermark: '暗',
    color: '#BE185D',
    bg: 'linear-gradient(135deg, #FFF5FB 0%, #FDE8F3 100%)',
    border: 'rgba(249,168,212,0.7)',
    shadowColor: 'rgba(190,24,93,0.22)',
  },
];

'use client';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import IconButton from '@mui/material/IconButton';
import type { SxProps, Theme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';

import { useSpeech } from '@/hooks/useSpeech';

interface SpeakButtonProps {
  text: string;
  iconSize?: string;
  sx?: SxProps<Theme>;
  /** Called before playback starts, for surfaces that need to pause on interaction. */
  onSpeak?: () => void;
}

export function SpeakButton({ text, iconSize = '1rem', sx, onSpeak }: SpeakButtonProps) {
  const t = useTranslations('Common');
  const { speak, speaking } = useSpeech();
  return (
    <IconButton
      size="small"
      onClick={(e) => {
        e.stopPropagation();
        onSpeak?.();
        speak(text);
      }}
      disabled={speaking}
      aria-label={t('readAloud')}
      sx={{ p: 0.5, color: '#aaa', '&:hover': { color: '#555' }, flexShrink: 0, ...sx }}
    >
      <VolumeUpIcon sx={{ fontSize: iconSize }} />
    </IconButton>
  );
}

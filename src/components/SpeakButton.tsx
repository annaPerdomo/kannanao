'use client';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import IconButton from '@mui/material/IconButton';
import type { SxProps, Theme } from '@mui/material/styles';

import { useSpeech } from '@/hooks/useSpeech';

interface SpeakButtonProps {
  text: string;
  iconSize?: string;
  sx?: SxProps<Theme>;
}

export function SpeakButton({ text, iconSize = '1rem', sx }: SpeakButtonProps) {
  const { speak, speaking } = useSpeech();
  return (
    <IconButton
      size="small"
      onClick={(e) => {
        e.stopPropagation();
        speak(text);
      }}
      disabled={speaking}
      aria-label="Read aloud"
      sx={{ p: 0.5, color: '#aaa', '&:hover': { color: '#555' }, flexShrink: 0, ...sx }}
    >
      <VolumeUpIcon sx={{ fontSize: iconSize }} />
    </IconButton>
  );
}

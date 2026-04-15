'use client';
import IconButton from '@mui/material/IconButton';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import type { SxProps, Theme } from '@mui/material/styles';
import { useSpeech } from '@/hooks/useSpeech';

interface SpeakButtonProps {
  text: string;
  lang?: string;
  iconSize?: string;
  sx?: SxProps<Theme>;
}

export function SpeakButton({ text, lang = 'ja-JP', iconSize = '1rem', sx }: SpeakButtonProps) {
  const { speak, speaking } = useSpeech();
  return (
    <IconButton
      size="small"
      onClick={(e) => { e.stopPropagation(); speak(text, lang); }}
      disabled={speaking}
      sx={{ p: 0.5, color: '#aaa', '&:hover': { color: '#555' }, flexShrink: 0, ...sx }}
    >
      <VolumeUpIcon sx={{ fontSize: iconSize }} />
    </IconButton>
  );
}

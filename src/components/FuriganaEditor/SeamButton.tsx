'use client';
import ContentCutRoundedIcon from '@mui/icons-material/ContentCutRounded';
import LinkRoundedIcon from '@mui/icons-material/LinkRounded';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useTranslations } from 'next-intl';

import { type FuriganaSize, seamSx } from './styles';

interface SeamButtonProps {
  kind: 'join' | 'split';
  left: string;
  right: string;
  onClick: (anchor: HTMLElement) => void;
  size: FuriganaSize;
  disabled?: boolean;
}

export function SeamButton({ kind, left, right, onClick, size, disabled }: SeamButtonProps) {
  const t = useTranslations('FuriganaEditor');
  const label = t(kind, { left, right });

  return (
    <Tooltip title={disabled ? '' : label} disableInteractive>
      <Box component="span" sx={{ display: 'inline-flex' }}>
        <IconButton
          aria-label={label}
          onClick={(e) => onClick(e.currentTarget)}
          disabled={disabled}
          sx={seamSx(size)}
        >
          {kind === 'join' ? <LinkRoundedIcon /> : <ContentCutRoundedIcon />}
        </IconButton>
      </Box>
    </Tooltip>
  );
}

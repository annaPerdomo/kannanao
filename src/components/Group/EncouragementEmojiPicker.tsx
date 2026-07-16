'use client';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { EmojiPickerPopover } from '@/components/EmojiPickerPopover';

interface EncouragementEmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  allowEmpty?: boolean;
}

export function EncouragementEmojiPicker({
  value,
  onChange,
  allowEmpty,
}: EncouragementEmojiPickerProps) {
  const theme = useTheme();
  const { brand } = theme.palette;
  const t = useTranslations('Group.emojiPicker');
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <Box
        role="button"
        tabIndex={0}
        aria-label={t('chooseEmoji')}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setAnchorEl(e.currentTarget);
        }}
        sx={{
          width: 38,
          height: 38,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          border: `2px solid ${value ? brand[400] : alpha(brand[300], 0.5)}`,
          bgcolor: value ? alpha(brand[100], 0.6) : alpha(brand[50], 0.3),
          fontSize: '1.2rem',
          transition: 'all 0.15s ease',
          '&:hover': { bgcolor: alpha(brand[200], 0.7), transform: 'scale(1.1)' },
        }}
      >
        {value || '—'}
      </Box>
      {allowEmpty && value && (
        <Box
          role="button"
          tabIndex={0}
          aria-label={t('removeEmoji')}
          onClick={() => onChange('')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onChange('');
          }}
          sx={{
            fontSize: '0.75rem',
            color: 'text.secondary',
            cursor: 'pointer',
            '&:hover': { color: 'text.primary' },
          }}
        >
          {t('remove')}
        </Box>
      )}
      <EmojiPickerPopover
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        onSelect={onChange}
      />
    </Stack>
  );
}

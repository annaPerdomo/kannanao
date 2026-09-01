'use client';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import { Box, Collapse, IconButton, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { getKanaEntry } from '@/lib/kanaCurriculum';

interface KanaHintProps {
  kana: string;
  available: boolean;
}

export function KanaHint({ kana, available }: KanaHintProps) {
  const t = useTranslations('KanaJourney.common');
  const locale = useLocale();
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const mnemonic = getKanaEntry(kana)?.mnemonic;

  useEffect(() => setOpen(false), [kana]);

  if (!available || !mnemonic) return null;

  return (
    <Box sx={{ textAlign: 'center' }}>
      <IconButton
        size="small"
        aria-label={t('hint')}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        sx={{ color: 'text.secondary' }}
      >
        <LightbulbOutlinedIcon fontSize="small" />
      </IconButton>
      {/* unmountOnExit: a collapsed hint is still in the DOM and readable by a
          screen reader, which would hand out the answer before it was asked for. */}
      <Collapse in={open} unmountOnExit>
        <Typography
          variant="body2"
          sx={{
            color: 'text.primary',
            bgcolor: alpha(theme.palette.brand[300], 0.15),
            borderRadius: 2,
            px: 2,
            py: 1,
            mx: 'auto',
            maxWidth: 420,
          }}
        >
          {locale === 'ja' ? mnemonic.ja : mnemonic.en}
        </Typography>
      </Collapse>
    </Box>
  );
}

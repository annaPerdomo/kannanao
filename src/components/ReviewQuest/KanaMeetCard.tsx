'use client';

import { Box, Button, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useLocale, useTranslations } from 'next-intl';

import { KanaGlyph } from '@/components/KanaJourney';
import { useSpeech } from '@/hooks/useSpeech';
import { getKanaEntry } from '@/lib/kanaCurriculum';

export interface KanaMeetCardProps {
  kana: string;
  onNext: () => void;
}

export function KanaMeetCard({ kana, onNext }: KanaMeetCardProps) {
  const t = useTranslations('Review.reviewQuest');
  const theme = useTheme();
  const locale = useLocale();
  const { speak } = useSpeech();
  const entry = getKanaEntry(kana);

  return (
    <Box sx={{ width: '100%', textAlign: 'center' }}>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
        {t('meetTitle')}
      </Typography>

      <KanaGlyph
        kana={kana}
        onPlay={() => speak(kana)}
        playLabel={t('meetTapToHear')}
        sx={{ mx: 'auto', mb: 2, bgcolor: alpha(theme.palette.brand[300], 0.12) }}
      />

      <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
        {entry?.romaji}
      </Typography>

      {entry?.mnemonic && (
        <Typography
          variant="body2"
          sx={{
            color: 'text.primary',
            bgcolor: alpha(theme.palette.brand[300], 0.15),
            borderRadius: 2,
            px: 2,
            py: 1,
            mx: 'auto',
            mb: 3,
            maxWidth: 420,
          }}
        >
          {locale === 'ja' ? entry.mnemonic.ja : entry.mnemonic.en}
        </Typography>
      )}

      <Button variant="contained" size="large" onClick={onNext} sx={{ borderRadius: 999, px: 5 }}>
        {t('meetGotIt')}
      </Button>
    </Box>
  );
}

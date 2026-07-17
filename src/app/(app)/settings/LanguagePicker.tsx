'use client';

import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useTranslations } from 'next-intl';

import { useLocalePreference } from '@/hooks/useLocalePreference';
import type { Locale } from '@/i18n/config';

// Never translate these labels or turn them into message keys: someone stuck
// in a language they can't read has to be able to spot their own.
const OPTIONS: { locale: Locale; label: string }[] = [
  { locale: 'en', label: 'English' },
  { locale: 'ja', label: '日本語' },
];

/**
 * The Settings language picker. The NavBar's LanguageMenu is the everyday
 * fast path; this stays as the place the choice is explained.
 */
export function LanguagePicker() {
  const t = useTranslations('Common.language');
  const { locale, setLocale, saving, error, saved } = useLocalePreference();

  return (
    <Stack gap={1.5} alignItems="flex-start">
      <ToggleButtonGroup
        exclusive
        value={locale}
        disabled={saving}
        aria-label={t('ariaLabel')}
        onChange={(_, next: Locale | null) => {
          // null = a click on the already-selected pill. Record it anyway:
          // that's how a NULL profile locale becomes an explicit choice.
          void setLocale(next ?? locale);
        }}
        sx={{ gap: 1, flexWrap: 'wrap' }}
      >
        {OPTIONS.map((option) => (
          <ToggleButton
            key={option.locale}
            value={option.locale}
            lang={option.locale}
            aria-label={option.label}
            sx={(theme) => ({
              px: 2.5,
              py: 1,
              borderRadius: '999px !important',
              border: `1.5px solid ${alpha(theme.palette.brand[300], 0.5)} !important`,
              textTransform: 'none',
              fontSize: '0.95rem',
              fontWeight: 600,
              // text.primary clears WCAG AA on the pastel surface; brand
              // mid-tones don't.
              color: 'text.primary',
              '&.Mui-selected': {
                bgcolor: alpha(theme.palette.brand[300], 0.32),
                color: 'text.primary',
                '&:hover': { bgcolor: alpha(theme.palette.brand[300], 0.4) },
              },
            })}
          >
            {option.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {error && (
        <Alert severity="error" sx={{ borderRadius: 3, width: '100%' }}>
          {t('saveError')}
        </Alert>
      )}
      {saved && !error && (
        <Alert severity="success" sx={{ borderRadius: 3, width: '100%' }}>
          {t('saved')}
        </Alert>
      )}
    </Stack>
  );
}

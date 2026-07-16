'use client';

import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useTranslations } from 'next-intl';

import { useLocalePreference } from '@/hooks/useLocalePreference';
import type { Locale } from '@/i18n/config';

// Each language is written in its own language, and these two strings are the
// one bit of copy in the app that must never be translated or turned into
// message keys. Translating them would render this control useless in exactly
// the situation it exists for: someone who cannot read the current UI and needs
// to find their way out. "日本語" is what a lost Japanese reader scans for; a
// translated "Japanese" is not. No flags, either — a flag is a country, and
// neither language belongs to one.
const OPTIONS: { locale: Locale; label: string }[] = [
  { locale: 'en', label: 'English' },
  { locale: 'ja', label: '日本語' },
];

/**
 * The Settings language picker — the app's only language control (the landing
 * has its own pre-signup toggle; see src/app/landing/LanguageToggle.tsx).
 *
 * Both options are always on screen rather than behind a <Select>: a user who
 * can't read the current language can't be asked to open a menu to escape it,
 * and two big pills are a better tap target for the youngest users than a
 * dropdown. Two languages is also small enough that a menu would save nothing.
 */
export function LanguagePicker() {
  const t = useTranslations('Settings.language');
  const { locale, setLocale, saving, error, saved } = useLocalePreference();

  return (
    <Stack gap={1.5} alignItems="flex-start">
      <ToggleButtonGroup
        exclusive
        value={locale}
        disabled={saving}
        aria-label={t('ariaLabel')}
        onChange={(_, next: Locale | null) => {
          // `next` is null when the already-selected pill is clicked, which
          // ToggleButtonGroup reads as a deselect. There is no "no language"
          // state to deselect into, so treat it as re-affirming the current
          // choice and let it through: for an account whose locale column is
          // still NULL ("never chose"), that click is the user explicitly
          // picking, and it has to be recorded. See useLocalePreference.
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
              // text.primary, not a brand mid-tone: this sits on the section's
              // pastel glass surface and has to clear WCAG AA on it.
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

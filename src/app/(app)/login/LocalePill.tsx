'use client';

import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import { useTranslations } from 'next-intl';

import { useLocalePreference } from '@/hooks/useLocalePreference';
import type { Locale } from '@/i18n/config';

// Written in their own language on purpose — a visitor who can't read the
// current page must still recognize their way out (same rule as the landing
// toggle and LanguageMenu).
const OPTIONS: { locale: Locale; label: string; ariaLabel: string }[] = [
  { locale: 'en', label: 'EN', ariaLabel: 'English' },
  { locale: 'ja', label: '日本語', ariaLabel: '日本語' },
];

/**
 * The login page's EN | 日本語 switch. The navbar (and its LanguageMenu icon)
 * is hidden on /login, so this pill is the page's only way to change language —
 * explicit labels, not an icon, because a lost visitor has to spot it.
 * Persistence is useLocalePreference: profile row (when signed in) → cookie →
 * router.refresh, no navigation away from the login form.
 */
export function LocalePill() {
  const t = useTranslations('Common.language');
  const { locale, setLocale, saving } = useLocalePreference();

  return (
    <Box
      component="nav"
      aria-label={t('ariaLabel')}
      sx={(theme) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 0.25,
        p: 0.5,
        borderRadius: 6,
        bgcolor: theme.palette.surfaces.glass,
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: `1px solid ${alpha(theme.palette.brand[300], 0.45)}`,
        boxShadow: `0 4px 20px ${alpha(theme.palette.brand[300], 0.22)}`,
      })}
    >
      {OPTIONS.map((option) => {
        const isCurrent = option.locale === locale;
        return (
          <Box
            key={option.locale}
            component="button"
            type="button"
            lang={option.locale}
            aria-label={option.ariaLabel}
            aria-current={isCurrent ? 'true' : undefined}
            disabled={saving}
            onClick={() => void setLocale(option.locale)}
            sx={(theme) => ({
              px: 1.5,
              py: { xs: 1, sm: 0.5 },
              border: 'none',
              borderRadius: 5,
              color: 'text.primary',
              fontFamily: 'inherit',
              fontSize: '0.78rem',
              fontWeight: isCurrent ? 700 : 500,
              lineHeight: 1.4,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              bgcolor: isCurrent ? alpha(theme.palette.brand[300], 0.3) : 'transparent',
              '&:hover': {
                bgcolor: alpha(theme.palette.brand[300], isCurrent ? 0.38 : 0.18),
              },
              '&:disabled': { cursor: 'default', opacity: 0.6 },
            })}
          >
            {option.label}
          </Box>
        );
      })}
    </Box>
  );
}

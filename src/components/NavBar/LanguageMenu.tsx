'use client';
import CheckIcon from '@mui/icons-material/Check';
import TranslateIcon from '@mui/icons-material/Translate';
import { Alert, IconButton, ListItemIcon, Menu, MenuItem, Snackbar } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { useLocalePreference } from '@/hooks/useLocalePreference';
import type { Locale } from '@/i18n/config';

// Never translate these labels or turn them into message keys: someone stuck
// in a language they can't read has to be able to spot their own.
const OPTIONS: { locale: Locale; label: string }[] = [
  { locale: 'en', label: 'English' },
  { locale: 'ja', label: '日本語' },
];

export function LanguageMenu() {
  // Common, not Settings: the NavBar is import-reachable from the static
  // landing, and Settings would bloat its payload (LANDING_NAMESPACES guard).
  const t = useTranslations('Common.language');
  const { brand, surfaces } = useTheme().palette;
  const { locale, setLocale, saving, error, saved } = useLocalePreference();

  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // The hook resets error/saved before each attempt, so this fires even when
  // two attempts in a row produce the identical message.
  useEffect(() => {
    if (error || saved) setSnackbarOpen(true);
  }, [error, saved]);

  const pick = (next: Locale) => {
    setMenuAnchor(null);
    // Deliberately no same-locale early return — see useLocalePreference.
    void setLocale(next);
  };

  return (
    <>
      <IconButton
        aria-label={t('ariaLabel')}
        onClick={(e) => setMenuAnchor(e.currentTarget)}
        disabled={saving}
        sx={{ color: brand[500] }}
      >
        <TranslateIcon sx={{ fontSize: '1.1rem' }} />
      </IconButton>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              border: `1px solid ${alpha(brand[300], 0.35)}`,
              boxShadow: `0 8px 32px ${alpha(brand[700], 0.12)}`,
              bgcolor: surfaces.overlay,
              minWidth: 160,
            },
          },
          list: { 'aria-label': t('ariaLabel') },
        }}
      >
        {OPTIONS.map((option) => {
          const isCurrent = option.locale === locale;
          return (
            <MenuItem
              key={option.locale}
              lang={option.locale}
              selected={isCurrent}
              onClick={() => pick(option.locale)}
              sx={{ gap: 0.5, color: brand[700], fontSize: '0.88rem', fontWeight: 600 }}
            >
              <ListItemIcon sx={{ minWidth: '1.4rem !important' }}>
                {isCurrent && <CheckIcon sx={{ fontSize: '1rem', color: brand[700] }} />}
              </ListItemIcon>
              {option.label}
            </MenuItem>
          );
        })}
      </Menu>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={error ? 'error' : 'success'}
          onClose={() => setSnackbarOpen(false)}
          sx={{ borderRadius: 3 }}
        >
          {error ? t('saveError') : t('saved')}
        </Alert>
      </Snackbar>
    </>
  );
}

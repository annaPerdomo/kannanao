'use client';

import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import { useTranslations } from 'next-intl';

import { BOTTOM_NAV_HEIGHT } from '@/components/NavBar/BottomNav';
import type { Locale } from '@/i18n/config';
import { writeLocaleCookie } from '@/i18n/localeCookie';

// Each language is written in its own language — a visitor who can't read the
// current page still has to recognize their way out of it. That makes these
// labels the one bit of copy here that must NOT be translated.
//
// The hrefs look lopsided and aren't: each points at that language's CANONICAL
// url, the same pair hreflang advertises. English lives at `/` — next.config.ts
// 308s /landing → / so the marketing page has one address, and /landing survives
// only as the middleware's internal rewrite target. Japanese has no such
// redirect, so /landing/ja is its own canonical address. Linking to /landing
// here would just bounce through the 308 back to /.
const OPTIONS: { locale: Locale; href: string; label: string }[] = [
  { locale: 'en', href: '/', label: 'EN' },
  { locale: 'ja', href: '/landing/ja', label: '日本語' },
];

/**
 * The landing's EN | 日本語 pair.
 *
 * Both landing pages are static, so nothing server-side can remember the pick
 * on the way in — writing the cookie on click is what makes it stick. The
 * middleware reads it to route anonymous `/`, and src/i18n/request.ts reads the
 * same cookie once the visitor signs up and lands in the (app) group, so the
 * choice carries through signup instead of resetting at the door.
 *
 * Plain anchors, not next/link: the cookie only takes effect on the way through
 * the middleware, so the pick has to be a real request. A client-side navigation
 * would hand back a router-cached tree and skip the rewrite that reads it.
 *
 * Bottom-right, tracking the buddy's offsets. Every other corner is spoken for:
 * the sticky AppBar owns the top, BottomNav the bottom edge on mobile, and
 * bottom-left lands squarely on the hero's "Join the waitlist" CTA at laptop
 * heights (and under the dev-tools indicator). A floating pill has to overlap
 * *something* on scroll — better a demo card's empty corner than the one button
 * the page exists to get clicked.
 */
export function LanguageToggle({ current }: { current: Locale }) {
  const t = useTranslations('Landing.languageToggle');

  return (
    <Box
      component="nav"
      aria-label={t('ariaLabel')}
      sx={(theme) => ({
        position: 'fixed',
        right: { xs: 12, sm: 24 },
        bottom: {
          xs: `calc(${BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom) + 8px)`,
          sm: 28,
        },
        zIndex: 1200,
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
        const isCurrent = option.locale === current;
        return (
          <Box
            key={option.locale}
            component="a"
            href={option.href}
            hrefLang={option.locale}
            aria-label={t(option.locale)}
            aria-current={isCurrent ? 'page' : undefined}
            onClick={() => writeLocaleCookie(option.locale)}
            sx={(theme) => ({
              px: 1.25,
              py: 0.5,
              borderRadius: 5,
              // text.primary rather than a brand mid-tone: this floats over
              // every section's pastel background as you scroll.
              color: 'text.primary',
              fontSize: '0.78rem',
              fontWeight: isCurrent ? 700 : 500,
              lineHeight: 1.4,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              bgcolor: isCurrent ? alpha(theme.palette.brand[300], 0.3) : 'transparent',
              '&:hover': {
                bgcolor: alpha(theme.palette.brand[300], isCurrent ? 0.38 : 0.18),
              },
            })}
          >
            {option.label}
          </Box>
        );
      })}
    </Box>
  );
}

'use client';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ThemeFonts } from '@/components/ThemeFonts';
import { UpdatePrompt } from '@/components/UpdatePrompt';
import { AuthProvider } from '@/contexts/AuthContext';
import { CardBorderProvider } from '@/contexts/CardBorderContext';
import { DeckDialogProvider } from '@/contexts/DeckDialogContext';
import { ShopProvider } from '@/contexts/ShopContext';
import { AppThemeProvider } from '@/contexts/ThemeContext';
import { useStaleTabReload } from '@/hooks/useStaleTabReload';
import type { Locale } from '@/i18n/config';
import type { InitialAuth, InitialShop } from '@/lib/dbMappers';

export default function Providers({
  children,
  initialAuth,
  initialShop,
  locale,
}: {
  children: React.ReactNode;
  initialAuth?: InitialAuth;
  initialShop?: InitialShop | null;
  /**
   * The active UI locale, forwarded to the theme factory for MUI's built-in
   * strings. It is a PROP because this component renders inside both statically
   * prerendered landing builds: resolving the locale from the cookie in here
   * would opt /landing and /landing/ja out of static rendering. Callers pass
   * what they already know — a build-time constant on the landing, the
   * already-awaited getLocale() in the (app) layout. Omitted = English.
   */
  locale?: Locale;
}) {
  useStaleTabReload();

  return (
    <AuthProvider initialAuth={initialAuth}>
      <AppThemeProvider locale={locale}>
        <ThemeFonts />
        <UpdatePrompt />
        <ErrorBoundary>
          <ShopProvider initialShop={initialShop}>
            <CardBorderProvider>
              <DeckDialogProvider>{children}</DeckDialogProvider>
            </CardBorderProvider>
          </ShopProvider>
        </ErrorBoundary>
      </AppThemeProvider>
    </AuthProvider>
  );
}

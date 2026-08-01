import { expect, test } from '@playwright/test';

import en from '../../src/messages/en.json';
import ja from '../../src/messages/ja.json';

/**
 * The login page's LocalePill, exercised signed-out — /login hides the NavBar
 * (and its LanguageMenu), so the pill is the only language switch on the page
 * where Settings is unreachable, and credential-free so it runs everywhere.
 */
test.describe('Login locale pill (anonymous)', () => {
  test('is present on /login, where Settings is unreachable', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('navigation', { name: en.Common.language.ariaLabel })).toBeVisible({
      timeout: 10000,
    });
  });

  test('offers each language in its own language', async ({ page }) => {
    await page.goto('/login');
    const pill = page.getByRole('navigation', { name: en.Common.language.ariaLabel });

    // Exact strings, not message keys — these labels are untranslatable by design.
    await expect(pill.getByRole('button', { name: 'English' })).toBeVisible({ timeout: 10000 });
    await expect(pill.getByRole('button', { name: '日本語' })).toBeVisible();
  });

  test('switches the app to Japanese and back, persisting the cookie', async ({ page }) => {
    await page.goto('/login');
    const enPill = page.getByRole('navigation', { name: en.Common.language.ariaLabel });
    await enPill.getByRole('button', { name: '日本語' }).click();

    const jaPill = page.getByRole('navigation', { name: ja.Common.language.ariaLabel });
    await expect(jaPill).toBeVisible({ timeout: 15000 });
    await expect(page.locator('html')).toHaveAttribute('lang', 'ja', { timeout: 10000 });
    expect((await page.context().cookies()).find((c) => c.name === 'NEXT_LOCALE')?.value).toBe(
      'ja',
    );

    // And back out again, from the Japanese UI.
    await jaPill.getByRole('button', { name: 'English' }).click();
    await expect(enPill).toBeVisible({ timeout: 15000 });
    await expect(page.locator('html')).toHaveAttribute('lang', 'en', { timeout: 10000 });
    expect((await page.context().cookies()).find((c) => c.name === 'NEXT_LOCALE')?.value).toBe(
      'en',
    );
  });
});

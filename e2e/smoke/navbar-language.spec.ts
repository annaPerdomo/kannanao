import { expect, test } from '@playwright/test';

import en from '../../src/messages/en.json';
import ja from '../../src/messages/ja.json';

/**
 * NavBar language menu, exercised signed-out on /login — the page where the
 * Settings picker is unreachable, and credential-free so it runs everywhere.
 */
test.describe('NavBar language menu (anonymous)', () => {
  test('is present on /login, where Settings is unreachable', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: en.Common.language.ariaLabel })).toBeVisible({
      timeout: 10000,
    });
  });

  test('offers each language in its own language', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: en.Common.language.ariaLabel }).click();

    // Exact strings, not message keys — these labels are untranslatable by design.
    await expect(page.getByRole('menuitem', { name: 'English' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: '日本語' })).toBeVisible();
  });

  test('switches the app to Japanese and back, persisting the cookie', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: en.Common.language.ariaLabel }).click();
    await page.getByRole('menuitem', { name: '日本語' }).click();

    const jaTrigger = page.getByRole('button', { name: ja.Common.language.ariaLabel });
    await expect(jaTrigger).toBeVisible({ timeout: 15000 });
    await expect(page.locator('html')).toHaveAttribute('lang', 'ja', { timeout: 10000 });
    expect((await page.context().cookies()).find((c) => c.name === 'NEXT_LOCALE')?.value).toBe(
      'ja',
    );

    // And back out again, from the Japanese UI.
    await jaTrigger.click();
    await page.getByRole('menuitem', { name: 'English' }).click();
    await expect(page.getByRole('button', { name: en.Common.language.ariaLabel })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator('html')).toHaveAttribute('lang', 'en', { timeout: 10000 });
    expect((await page.context().cookies()).find((c) => c.name === 'NEXT_LOCALE')?.value).toBe(
      'en',
    );
  });
});

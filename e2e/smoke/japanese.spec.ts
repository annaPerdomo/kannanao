import { expect, type Page, test } from '@playwright/test';

import en from '../../src/messages/en.json';
import ja from '../../src/messages/ja.json';

/**
 * End-to-end proof of the Japanese experience. Assertions import their
 * expected copy from src/messages/ja.json rather than duplicating it, so a
 * retranslation updates the test with it.
 *
 * The authenticated half needs a real account: set E2E_JA_USERNAME and
 * E2E_JA_PASSWORD (any account works — the tests only read the shell and flip
 * the language setting back and forth, ending on Japanese being deselected to
 * English only within the test's own cookie jar).
 */

// The Japanese landing marks its own subtree (the root <html> of the shared
// static shell stays "en"); see landing-language.spec.ts.
const jaSubtree = 'div[lang="ja"]';

test.describe('Japanese landing (anonymous)', () => {
  test('Accept-Language: ja gets the Japanese landing with translated copy', async ({
    browser,
  }) => {
    const context = await browser.newContext({ locale: 'ja-JP' });
    const page = await context.newPage();

    await page.goto('/');

    await expect(page.locator(jaSubtree).first()).toBeAttached({ timeout: 10000 });
    // Translated, not the English fallback: real ja.json copy is on the page.
    await expect(page.getByText(ja.Landing.hero.waitlistBadge)).toBeVisible();
    await context.close();
  });
});

const USERNAME = process.env.E2E_JA_USERNAME;
const PASSWORD = process.env.E2E_JA_PASSWORD;

test.describe('Japanese app shell (authenticated)', () => {
  test.skip(
    !USERNAME || !PASSWORD,
    'Set E2E_JA_USERNAME / E2E_JA_PASSWORD to run the authenticated Japanese-shell checks',
  );

  /** Sign in through the real login form with the NEXT_LOCALE=ja cookie set. */
  async function signInJapanese(page: Page) {
    await page
      .context()
      .addCookies([{ name: 'NEXT_LOCALE', value: 'ja', url: 'http://localhost:3000' }]);
    await page.goto('/login');
    await page.locator('input[type="text"], input[type="email"]').first().fill(USERNAME!);
    await page.locator('input[type="password"]').first().fill(PASSWORD!);
    await page
      .locator('button[type="submit"], button:has-text("Sign"), button:has-text("ログイン")')
      .first()
      .click();
    // Signed-in shell: the main navigation landmark appears (label from ja.json).
    await expect(
      page.getByRole('navigation', { name: ja.Nav.mainNavigationAriaLabel }),
    ).toBeAttached({ timeout: 15000 });
  }

  test('shows Japanese nav labels and html lang="ja"', async ({ page }) => {
    await signInJapanese(page);

    const nav = page.getByRole('navigation', { name: ja.Nav.mainNavigationAriaLabel });
    await expect(nav.getByText(ja.Nav.items.home)).toBeAttached();
    await expect(nav.getByText(ja.Nav.items.stats)).toBeAttached();
    await expect(nav.getByText(ja.Nav.items.shop)).toBeAttached();

    // LocaleSync stamps the active locale onto the document element.
    await expect(page.locator('html')).toHaveAttribute('lang', 'ja', { timeout: 10000 });
  });

  test('the Settings switcher flips the app back to English', async ({ page }) => {
    await signInJapanese(page);

    await page.goto('/settings');
    // The picker's labels are deliberately untranslatable ("English" / "日本語").
    await page.getByRole('button', { name: 'English', exact: true }).click();

    // The shell re-renders in English…
    const nav = page.getByRole('navigation', { name: en.Nav.mainNavigationAriaLabel });
    await expect(nav.getByText(en.Nav.items.home)).toBeAttached({ timeout: 15000 });
    await expect(page.locator('html')).toHaveAttribute('lang', 'en', { timeout: 10000 });

    // …and the choice is persisted in the cookie the middleware reads.
    const cookies = await page.context().cookies();
    expect(cookies.find((c) => c.name === 'NEXT_LOCALE')?.value).toBe('en');
  });
});

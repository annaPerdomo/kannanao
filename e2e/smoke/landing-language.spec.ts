import { expect, test } from '@playwright/test';

// The Japanese landing is identified by structure, not copy: until the
// translation pass lands, ja.json is empty and /landing/ja renders the English
// fallback word for word. `lang="ja"` on the page's own subtree (the root <html>
// is the shared static shell and stays "en") is the marker that survives both
// that gap and the later translation.
const jaSubtree = 'div[lang="ja"]';

test.describe('Japanese landing', () => {
  test('/landing/ja loads and marks its subtree as Japanese', async ({ page }) => {
    const response = await page.goto('/landing/ja');
    expect(response?.status()).toBeLessThan(500);
    await expect(page.locator(jaSubtree).first()).toBeAttached({ timeout: 10000 });
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });

  test('/landing/ja points hreflang at both languages', async ({ page }) => {
    await page.goto('/landing/ja');
    await expect(page.locator('link[rel="alternate"][hreflang="ja"]')).toHaveAttribute(
      'href',
      'https://www.tangodachi.app/landing/ja',
    );
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
      'href',
      'https://www.tangodachi.app',
    );
  });

  // The English landing has one address, `/`: next.config.ts 308s /landing back
  // to it, and the middleware rewrites `/` onto the static page from there.
  test('/landing 308s to the canonical / and serves English', async ({ page }) => {
    await page.goto('/landing');
    await expect(page).toHaveURL(/localhost:3000\/$/);
    await expect(page.locator(jaSubtree)).toHaveCount(0);
  });
});

test.describe('anonymous / language pick', () => {
  test('serves the Japanese landing to a Japanese browser', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'ja-JP' });
    const page = await context.newPage();

    await page.goto('/');

    await expect(page).toHaveURL(/\/$/); // rewrite, not redirect — the URL bar still says /
    await expect(page.locator(jaSubtree).first()).toBeAttached({ timeout: 10000 });
    await context.close();
  });

  test('serves the English landing to an English browser', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'en-US' });
    const page = await context.newPage();

    await page.goto('/');

    await expect(page.locator('main#main-content')).toBeAttached({ timeout: 10000 });
    await expect(page.locator(jaSubtree)).toHaveCount(0);
    await context.close();
  });

  // The ordering that matters: an explicit pick has to beat the browser's
  // header, or clicking EN on a Japanese machine would never stick.
  test('an explicit English cookie beats a Japanese Accept-Language', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'ja-JP' });
    await context.addCookies([{ name: 'NEXT_LOCALE', value: 'en', url: 'http://localhost:3000' }]);
    const page = await context.newPage();

    await page.goto('/');

    await expect(page.locator('main#main-content')).toBeAttached({ timeout: 10000 });
    await expect(page.locator(jaSubtree)).toHaveCount(0);
    await context.close();
  });

  test('a Japanese cookie beats an English Accept-Language', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'en-US' });
    await context.addCookies([{ name: 'NEXT_LOCALE', value: 'ja', url: 'http://localhost:3000' }]);
    const page = await context.newPage();

    await page.goto('/');

    await expect(page.locator(jaSubtree).first()).toBeAttached({ timeout: 10000 });
    await context.close();
  });
});

test.describe('landing language toggle', () => {
  // hreflang rather than the link text: the accessible name is translated copy,
  // so it changes under the toggle and again at the translation pass.
  const jaLink = 'nav a[hreflang="ja"]';
  const enLink = 'nav a[hreflang="en"]';

  test('links both landings and is reachable by name', async ({ page }) => {
    await page.goto('/landing');
    const toggle = page.getByRole('navigation', { name: 'Language' });
    await expect(toggle).toBeVisible({ timeout: 10000 });
    await expect(toggle.getByRole('link', { name: 'Japanese' })).toBeVisible();
    await expect(toggle.getByRole('link', { name: 'English' })).toBeVisible();
  });

  test('switching to Japanese sticks — including for a later visit to /', async ({ page }) => {
    await page.goto('/landing');
    await page.locator(jaLink).click();

    await expect(page).toHaveURL(/\/landing\/ja$/);
    await expect(page.locator(jaSubtree).first()).toBeAttached();

    const cookies = await page.context().cookies();
    expect(cookies.find((c) => c.name === 'NEXT_LOCALE')?.value).toBe('ja');

    // The point of the cookie: `/` now picks Japanese on its own.
    await page.goto('/');
    await expect(page.locator(jaSubtree).first()).toBeAttached({ timeout: 10000 });
  });

  test('switching back to English sticks', async ({ page }) => {
    await page.goto('/landing/ja');
    await page.locator(enLink).click();

    // English's canonical url is `/`, not /landing — see the toggle's OPTIONS.
    await expect(page).toHaveURL(/localhost:3000\/$/);
    await expect(page.locator(jaSubtree)).toHaveCount(0);

    const cookies = await page.context().cookies();
    expect(cookies.find((c) => c.name === 'NEXT_LOCALE')?.value).toBe('en');
  });
});

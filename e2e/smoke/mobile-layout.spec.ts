import { expect, test } from '@playwright/test';

import { signIn } from '../helpers/signIn';

// Mirrors BRAND_LOCKUP_MIN_WIDTH in src/components/NavBar/constants.ts.
const MIN_LOCKUP_WIDTH = 96;

const PHONES = [
  { name: 'iPhone 12', width: 390, height: 844 },
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'small Android', width: 360, height: 740 },
];

// '/' rather than '/landing': anonymous traffic reaches the landing through the
// middleware rewrite, and requesting the route directly only redirects back.
const PUBLIC_ROUTES = ['/login', '/', '/travel', '/travel/phrases', '/travel/katakana'];

// A cold dev server compiles each of these routes on first request.
test.describe.configure({ timeout: 120_000 });

test.describe('Mobile layout', () => {
  for (const phone of PHONES) {
    test(`no page is wider than a ${phone.name}`, async ({ page }) => {
      await page.setViewportSize({ width: phone.width, height: phone.height });

      for (const route of PUBLIC_ROUTES) {
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1500);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        expect(overflow, `${route} overflows horizontally by ${overflow}px`).toBeLessThanOrEqual(0);
      }
    });
  }

  test('no element pans sideways inside its own scroll box', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/travel', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // A box that pans sideways unintentionally (a decoration hanging past its
    // edge, say) eats the swipe the reader meant for the page.
    const unintended = await page.evaluate(
      () =>
        [...document.querySelectorAll<HTMLElement>('*')].filter((el) => {
          const { overflowX } = getComputedStyle(el);
          return (
            (overflowX === 'auto' || overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 1
          );
        }).length,
    );
    expect(unintended).toBe(0);
  });
});

/**
 * Runs on webkit too: `word-break: keep-all` gives WebKit no break after 「、」,
 * so the greeting ran off the hero on iOS only. Needs SHOT_USERNAME / SHOT_PASSWORD.
 */
test.describe('Signed-in home on a phone', () => {
  const USERNAME = process.env.SHOT_USERNAME;
  const PASSWORD = process.env.SHOT_PASSWORD;

  test.skip(!USERNAME || !PASSWORD, 'Set SHOT_USERNAME / SHOT_PASSWORD to run the home checks');
  test.describe.configure({ timeout: 240_000 });

  for (const phone of PHONES) {
    test(`the home fits a ${phone.name}`, async ({ page }) => {
      await page.setViewportSize({ width: phone.width, height: phone.height });
      await signIn(page);
      await page.waitForTimeout(2500);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `the home overflows horizontally by ${overflow}px`).toBeLessThanOrEqual(0);

      const lockup = await page.locator('header a[href="/"] img').first().boundingBox();
      expect(lockup).toBeTruthy();
      expect(lockup!.width, `the brand lockup shrank to ${lockup!.width}px`).toBeGreaterThanOrEqual(
        MIN_LOCKUP_WIDTH,
      );

      const greeting = page.locator('h4[lang="ja"]').first();
      await expect(greeting).toBeVisible();
      const clipped = await greeting.evaluate((el) => el.scrollWidth - el.clientWidth);
      expect(clipped, `the greeting is clipped by ${clipped}px`).toBeLessThanOrEqual(1);
    });
  }
});

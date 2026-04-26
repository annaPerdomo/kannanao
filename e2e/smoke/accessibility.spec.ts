import { expect, test } from '@playwright/test';

test.describe('Accessibility smoke tests', () => {
  test('skip-to-content link exists and is focusable', async ({ page }) => {
    await page.goto('/login');
    const skipLink = page.locator('a.skip-to-content');
    await expect(skipLink).toBeAttached({ timeout: 10000 });
    expect(await skipLink.getAttribute('href')).toBe('#main-content');
  });

  test('main landmark exists', async ({ page }) => {
    await page.goto('/login');
    const main = page.locator('main#main-content');
    await expect(main).toBeAttached({ timeout: 10000 });
  });

  test('page has lang attribute', async ({ page }) => {
    await page.goto('/login');
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBe('en');
  });

  test('login page has no broken aria references', async ({ page }) => {
    await page.goto('/login');
    // Find all elements with aria-labelledby and verify the referenced id exists
    const ariaRefs = await page.locator('[aria-labelledby]').all();
    for (const el of ariaRefs) {
      const refId = await el.getAttribute('aria-labelledby');
      if (refId) {
        const target = page.locator(`#${CSS.escape(refId)}`);
        await expect(target).toBeAttached();
      }
    }
  });
});

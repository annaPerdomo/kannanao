import { expect, test } from '@playwright/test';

import en from '../../src/messages/en.json';

// Gradient text fails silently: if background-clip stops resolving to `text`
// the copy stays in the DOM at full height, so text and visibility assertions
// both pass while a reader sees a solid gradient rectangle. The computed clip
// is the only assertion that catches it — and it has regressed once already.
const HEADLINE = en.Landing.hero.headline.split('<br></br>')[0];

async function expectGradientText(page: import('@playwright/test').Page) {
  const h1 = page.locator('h1').first();
  await expect(h1).toBeVisible();
  await expect(h1).toContainText(HEADLINE);

  const { clip, fill, hasGradient } = await h1.evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      clip: cs.webkitBackgroundClip || cs.backgroundClip,
      fill: cs.webkitTextFillColor,
      hasGradient: cs.backgroundImage.includes('linear-gradient'),
    };
  });

  expect(hasGradient).toBe(true);
  // Transparent fill is only safe while the clip holds — together they are
  // gradient text, apart they are an invisible headline.
  expect(fill).toBe('rgba(0, 0, 0, 0)');
  expect(clip).toBe('text');
}

test.describe('landing hero headline', () => {
  // Anonymous `/` routes by Accept-Language, which Playwright derives from the
  // system locale — a ja machine would otherwise get the Japanese hero.
  test.use({ locale: 'en-US' });

  test('renders its copy as clipped gradient text on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expectGradientText(page);
  });

  test('keeps the clip at the phone breakpoint', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expectGradientText(page);
  });
});

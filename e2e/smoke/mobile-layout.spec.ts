import { expect, test } from '@playwright/test';

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

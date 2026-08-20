import { expect, type Page, test } from '@playwright/test';

import en from '../../src/messages/en.json';

/**
 * Runs on webkit too: WebKit collapsed the old card sizing to a 0-width
 * sliver on iOS while Chromium looked fine.
 *
 * Needs SHOT_USERNAME / SHOT_PASSWORD in .env for an English-locale account
 * whose first deck holds more than one card.
 */

const USERNAME = process.env.SHOT_USERNAME;
const PASSWORD = process.env.SHOT_PASSWORD;

const CARD_RATIO = 452 / 320;
const MIN_CARD_WIDTH = 190;

const VIEWPORTS = [
  { name: 'a phone', width: 390, height: 844 },
  { name: 'a landscape tablet', width: 1024, height: 690 },
];

test.describe('Flashcard layout', () => {
  test.skip(
    !USERNAME || !PASSWORD,
    'Set SHOT_USERNAME / SHOT_PASSWORD to run the flashcard layout checks',
  );
  // A cold dev server compiles each route on first request.
  test.describe.configure({ timeout: 240_000 });

  async function openFlipStudy(page: Page) {
    const username = page.locator('input[type="text"], input[type="email"]').first();
    const password = page.locator('input[type="password"]').first();
    // Hydration wipes the typed credentials and a submit mid-compile never
    // navigates — retry both layers, WebKit needs it.
    await expect(async () => {
      if (new URL(page.url()).pathname === '/') return;
      if (!page.url().includes('/login')) await page.goto('/login');
      await expect(async () => {
        if ((await username.inputValue()) !== USERNAME) await username.fill(USERNAME!);
        if ((await password.inputValue()) !== PASSWORD) await password.fill(PASSWORD!);
        expect(await username.inputValue()).toBe(USERNAME);
        expect(await password.inputValue()).toBe(PASSWORD);
      }).toPass({ timeout: 60_000 });
      await page.locator('button[type="submit"]').first().click();
      await page.waitForURL('/', { timeout: 45_000 });
    }).toPass({ timeout: 150_000, intervals: [2_000] });
    await page.waitForLoadState('load');
    await page.goto('/decks').catch(() => page.goto('/decks'));
    const openDeckPrefix = en.Deck.deckCard.openDeckAria.split('{')[0];
    await page.locator(`[aria-label^="${openDeckPrefix}"]`).first().click({ timeout: 30_000 });
    // Deep-link rather than click: the deck hero differs by account type, but
    // /deck/<id>/study is the same flip study for everyone.
    await page.waitForURL(/\/deck\/[^/]+$/, { timeout: 30_000 });
    await page.goto(`${page.url()}/study`);

    const card = page.getByLabel(en.Study.flashcard.flipAria);
    await expect(card).toBeVisible({ timeout: 30_000 });
    // Let the deal-in animation land before measuring.
    await page.waitForTimeout(900);
    return card;
  }

  for (const vp of VIEWPORTS) {
    test(`the card is a readable trading card on ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const card = await openFlipStudy(page);
      const box = await card.boundingBox();
      expect(box).toBeTruthy();

      expect(box!.width).toBeGreaterThanOrEqual(MIN_CARD_WIDTH);
      const ratio = box!.height / box!.width;
      expect(ratio).toBeGreaterThan(CARD_RATIO - 0.03);
      expect(ratio).toBeLessThan(CARD_RATIO + 0.03);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width + 1);
      expect(box!.y + box!.height).toBeLessThanOrEqual(vp.height + 1);
    });
  }

  test('the speak button reads aloud without flipping; tapping the card flips it', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const card = await openFlipStudy(page);

    await card.getByLabel(en.Common.readAloud).first().click();
    await page.waitForTimeout(400);
    await expect(card).toHaveAttribute('aria-label', en.Study.flashcard.flipAria);

    // Tap the card's footer strip — no buttons or links live there.
    const box = (await card.boundingBox())!;
    await card.click({ position: { x: box.width / 2, y: box.height * 0.92 } });
    await expect(page.getByLabel(en.Study.flashcard.flipBackAria)).toBeVisible();
  });
});

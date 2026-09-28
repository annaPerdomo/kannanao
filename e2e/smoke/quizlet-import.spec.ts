import { expect, test } from '@playwright/test';

import en from '../../src/messages/en.json';
import { signIn } from '../helpers/signIn';

// Never saves: the dev server writes to the production database.

const USERNAME = process.env.SHOT_USERNAME;
const PASSWORD = process.env.SHOT_PASSWORD;
const SHOTS = process.env.QUIZLET_SHOTS_DIR;

const COLORS = {
  title: 'Ch5-5 Colors Flashcards | Quizlet',
  url: 'https://quizlet.com/826640319/ch5-5-colors-flash-cards/',
  cards: [
    { front: 'いろ 色', back: 'color', image: '' },
    { front: 'あか 赤', back: 'red', image: '' },
    { front: 'しろ 白', back: 'white', image: '' },
  ],
};
const PATTERNS = {
  title: 'Ch5 Sentence patterns Flashcards | Quizlet',
  url: 'https://quizlet.com/829922830/ch5-sentence-patterns-flash-cards/',
  cards: [
    { front: 'おかあさんの しゅみは なんですか。（Piano）', back: 'ははの しゅみは ピアノです。' },
  ],
};

function hashFor(set: unknown): string {
  return `#quizlet=${Buffer.from(JSON.stringify(set)).toString('base64url')}`;
}

test.describe('Quizlet import', () => {
  test.skip(!USERNAME || !PASSWORD, 'Set SHOT_USERNAME / SHOT_PASSWORD to run the import check');
  test.describe.configure({ timeout: 240_000 });

  test('each bookmarklet send becomes its own deck to review', async ({ page }) => {
    await signIn(page);
    await page.goto(`/materials?tab=quizlet${hashFor(COLORS)}`);
    const names = page.getByLabel(en.Materials.quizlet.deckName);
    await expect(names).toHaveCount(1, { timeout: 60_000 });
    await expect(names.first()).toHaveValue('Ch5-5 Colors');
    expect(new URL(page.url()).hash).toBe('');

    await page.goto(`/materials?tab=quizlet${hashFor(PATTERNS)}`);
    await expect(names).toHaveCount(2, { timeout: 60_000 });
    await expect(names.nth(1)).toHaveValue('Ch5 Sentence patterns');

    await page.getByRole('button', { name: en.Materials.quizlet.reviewCards }).first().click();
    await expect(page.getByText('赤', { exact: true })).toBeVisible();
    await expect(page.getByText('あか', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save 2 decks' })).toBeEnabled();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/desktop.png`, fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/phone.png`, fullPage: true });
  });
});

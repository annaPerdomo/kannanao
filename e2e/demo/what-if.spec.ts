import { expect, test } from '@playwright/test';

const MONDAY_WORD = '月よう日';

test.describe('What-if practice lab (public, no auth)', () => {
  test('marking Monday wrong shows the 10-minute retry line', async ({ page }) => {
    await page.goto('/how-it-works/practice');

    const toggleGroup = page.locator(`[aria-label="Mark ${MONDAY_WORD} right or wrong"]`).first();
    await toggleGroup.getByText('Missed it', { exact: true }).click();
    await page.getByRole('button', { name: "Finish today's practice" }).click();

    await expect(page.getByText(/10 minutes/)).toBeVisible();
    await page.screenshot({ path: 'test-results/demo-shots/what-if.png', fullPage: true });
  });

  test('the Japanese page title is Japanese', async ({ page }) => {
    await page.goto('/how-it-works/practice/ja');
    await expect(page).toHaveTitle(/練習のしくみ/);
  });
});

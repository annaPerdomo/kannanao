import { expect, test } from '@playwright/test';

test.describe('Public deck embed', () => {
  test('embed page for non-existent deck does not crash', async ({ page }) => {
    // Use a UUID that won't exist — should render gracefully (error message, not 500)
    const response = await page.goto('/embed/deck/00000000-0000-0000-0000-000000000000');
    expect(response?.status()).toBeLessThan(500);
  });

  test('public API returns 404 or empty for non-existent deck', async ({ request }) => {
    const response = await request.get('/api/public/deck/00000000-0000-0000-0000-000000000000');
    // Either 404 or 200 with error body — not a 500
    expect(response.status()).not.toBe(500);
  });
});

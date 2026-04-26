import { expect, test } from '@playwright/test';

test.describe('Navigation smoke tests', () => {
  test('home page loads without server error', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(500);
    await expect(page.getByText(/Kannanao/i)).toBeVisible({ timeout: 10000 });
  });

  test('login page is reachable', async ({ page }) => {
    const response = await page.goto('/login');
    expect(response?.status()).toBeLessThan(500);
    await expect(page).toHaveURL(/login/);
  });

  test('unknown route does not crash the app', async ({ page }) => {
    const response = await page.goto('/this-route-does-not-exist-12345');
    // Should not be a 500; 404 or redirect is fine
    expect(response?.status()).not.toBe(500);
  });

  test('navbar renders with brand link', async ({ page }) => {
    await page.goto('/login');
    const brand = page.getByText(/Kannanao/i).first();
    await expect(brand).toBeVisible({ timeout: 10000 });
  });
});

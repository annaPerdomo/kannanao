import { test, expect } from '@playwright/test';

/**
 * Smoke tests for auth flows.
 * These require `pnpm dev` running on http://localhost:3000.
 */

test.describe('Auth smoke tests', () => {
  test('should load the landing or home page', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(500);
  });

  test('should render the login page with username and password fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/login/);

    // Should have an input for username/email
    const usernameInput = page.locator('input[type="text"], input[type="email"], input[placeholder*="username" i], input[placeholder*="Username" i]');
    await expect(usernameInput.first()).toBeVisible({ timeout: 10000 });

    // Should have a password field
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput.first()).toBeVisible();
  });

  test('should show an error message on bad credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill in fake credentials
    const usernameInput = page.locator('input[type="text"], input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await usernameInput.fill('baduser_that_does_not_exist_xyz');
    await passwordInput.fill('wrongpassword123');

    // Click submit
    const submitBtn = page.locator('button[type="submit"], button:has-text("Sign"), button:has-text("Log")').first();
    await submitBtn.click();

    // An error message should appear
    await expect(
      page.locator('[role="alert"], .MuiAlert-root, [data-testid="error"]'),
    ).toBeVisible({ timeout: 10000 });
  });

  test('should show the Kannanao branding on the login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText(/Kannanao/i)).toBeVisible({ timeout: 10000 });
  });
});

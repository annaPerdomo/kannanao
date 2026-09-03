import { expect, type Page } from '@playwright/test';

const USERNAME = process.env.SHOT_USERNAME;
const PASSWORD = process.env.SHOT_PASSWORD;

/**
 * Hydration wipes the typed credentials and a submit issued mid-compile never
 * navigates, so both layers retry — WebKit needs it.
 */
export async function signIn(page: Page) {
  const username = page.locator('input[type="text"], input[type="email"]').first();
  const password = page.locator('input[type="password"]').first();
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
}

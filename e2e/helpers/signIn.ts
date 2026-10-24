import { expect, type Page } from '@playwright/test';

const USERNAME = process.env.SHOT_USERNAME;
const PASSWORD = process.env.SHOT_PASSWORD;

/**
 * Hydration wipes the typed credentials and a submit issued mid-compile never
 * navigates, so both layers retry — WebKit needs it.
 */
export async function signIn(page: Page, username = USERNAME, password = PASSWORD) {
  const usernameField = page.locator('input[type="text"], input[type="email"]').first();
  const passwordField = page.locator('input[type="password"]').first();
  await expect(async () => {
    if (new URL(page.url()).pathname === '/') return;
    if (!page.url().includes('/login')) await page.goto('/login');
    await expect(async () => {
      if ((await usernameField.inputValue()) !== username) await usernameField.fill(username!);
      if ((await passwordField.inputValue()) !== password) await passwordField.fill(password!);
      expect(await usernameField.inputValue()).toBe(username);
      // Never assert the password value itself — it would land in the HTML
      // report, which this repo's CI uploads publicly.
      expect((await passwordField.inputValue()).length).toBe(password!.length);
    }).toPass({ timeout: 60_000 });
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL('/', { timeout: 45_000 });
  }).toPass({ timeout: 150_000, intervals: [2_000] });
  await page.waitForLoadState('load');
}

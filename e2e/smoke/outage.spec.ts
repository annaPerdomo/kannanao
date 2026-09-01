import { expect, type Page, test } from '@playwright/test';

import en from '../../src/messages/en.json';
import ja from '../../src/messages/ja.json';

/**
 * Both halves are required: either alone is satisfied by a component that
 * always renders the same thing. Needs SHOT_USERNAME / SHOT_PASSWORD in .env.
 */

// Captured live from the gateway on 2026-08-26; served as text/plain, not JSON.
const ENVOY_BODY =
  'upstream connect error or disconnect/reset before headers. retried and the ' +
  'latest reset reason: remote connection failure, transport failure reason: ' +
  'delayed connect error: 111';

const USERNAME = process.env.SHOT_USERNAME;
const PASSWORD = process.env.SHOT_PASSWORD;
const JA_USERNAME = process.env.E2E_JA_USERNAME;
const JA_PASSWORD = process.env.E2E_JA_PASSWORD;

async function signIn(page: Page, username = USERNAME!, password = PASSWORD!) {
  await page.goto('/login');
  await page.locator('input[type="text"], input[type="email"]').first().fill(username);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button[type="submit"]').first().click();
  // The login page hands off with window.location.assign('/'), a full document
  // load — a page.goto() issued before it lands is aborted by it.
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 });
  // Nav items are MUI Buttons driving router.push, not anchors.
  await expect(
    page
      .getByRole('button', { name: new RegExp(`${en.Nav.items.decks}|${ja.Nav.items.decks}`) })
      .first(),
  ).toBeVisible({ timeout: 30000 });
}

/**
 * Break only the data plane. Routing `**` too would let a signed-out redirect
 * pass as a real error state.
 */
async function breakPostgrest(page: Page) {
  await page.route('**/rest/v1/**', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'text/plain',
      headers: { 'sb-gateway-version': '1', 'x-envoy-attempt-count': '6' },
      body: ENVOY_BODY,
    }),
  );
}

async function emptyLibrary(page: Page) {
  for (const table of ['decks', 'assignments']) {
    await page.route(`**/rest/v1/${table}*`, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
    );
  }
}

test.describe('the deck library when the backend is unreachable', () => {
  test.skip(!USERNAME || !PASSWORD, 'Set SHOT_USERNAME / SHOT_PASSWORD to run the outage fence');

  test('shows the error state and not the empty state', async ({ page }) => {
    await signIn(page);
    await breakPostgrest(page);
    await page.goto('/decks');

    await expect(page.getByText(en.Common.dataError.upstreamTitle)).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByText(en.Common.dataError.upstreamBody)).toBeVisible();

    await expect(page.getByText(en.Deck.decksPage.noDecksYet)).toHaveCount(0);
    await expect(page.getByText(en.Deck.decksPage.ownerEmptyHint)).toHaveCount(0);
  });

  test('never puts the gateway body or a status code on screen', async ({ page }) => {
    await signIn(page);
    await breakPostgrest(page);
    await page.goto('/decks');

    await expect(page.getByText(en.Common.dataError.upstreamTitle)).toBeVisible({
      timeout: 20000,
    });
    const body = (await page.locator('body').innerText()).toLowerCase();
    expect(body).not.toContain('connect error');
    expect(body).not.toContain('503');
    expect(body).not.toContain('upstream');
  });

  test('offers a retry that recovers once the backend comes back', async ({ page }) => {
    await signIn(page);
    await breakPostgrest(page);
    await page.goto('/decks');
    await expect(page.getByText(en.Common.dataError.upstreamTitle)).toBeVisible({
      timeout: 20000,
    });

    await page.unroute('**/rest/v1/**');
    await page.getByRole('button', { name: en.Common.dataError.tryAgain }).click();

    await expect(page.getByText(en.Common.dataError.upstreamTitle)).toHaveCount(0, {
      timeout: 20000,
    });
  });
});

test.describe('the deck library when the learner genuinely has no decks', () => {
  test.skip(!USERNAME || !PASSWORD, 'Set SHOT_USERNAME / SHOT_PASSWORD to run the outage fence');

  test('shows the empty state and not the error state', async ({ page }) => {
    await signIn(page);
    await emptyLibrary(page);
    await page.goto('/decks');

    await expect(page.getByText(en.Deck.decksPage.noDecksYet)).toBeVisible({ timeout: 20000 });

    await expect(page.getByText(en.Common.dataError.upstreamTitle)).toHaveCount(0);
    await expect(page.getByText(en.Common.dataError.offlineTitle)).toHaveCount(0);
    await expect(page.getByText(en.Common.dataError.genericTitle)).toHaveCount(0);
  });
});

/**
 * Locale follows the signed-in profile, not the NEXT_LOCALE cookie, so this
 * needs a Japanese-profile account. Key parity is pinned by messages.test.ts.
 */
test.describe('the outage state in Japanese', () => {
  test.skip(
    !JA_USERNAME || !JA_PASSWORD,
    'Set E2E_JA_USERNAME / E2E_JA_PASSWORD to run the Japanese outage fence',
  );

  test('reads as real Japanese copy, not a raw message key', async ({ page }) => {
    await signIn(page, JA_USERNAME!, JA_PASSWORD!);
    await breakPostgrest(page);
    await page.goto('/decks');

    await expect(page.getByText(ja.Common.dataError.upstreamTitle)).toBeVisible({
      timeout: 20000,
    });
    // A missing key renders as the key path itself, which is a shipped bug.
    await expect(page.getByText('Common.dataError')).toHaveCount(0);
    await expect(page.getByText(en.Common.dataError.upstreamTitle)).toHaveCount(0);
  });
});

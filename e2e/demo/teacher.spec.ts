import { expect, test } from '@playwright/test';

import { DEMO_DECK_KEY, DEMO_PERSONAS, demoUuid } from '@/lib/demo';

import { signIn } from '../helpers/signIn';

test.describe.configure({ timeout: 180_000 });

const MONDAY_WORD = '月よう日';

test('demo group and handout detail show the real simulated data', async ({ page }) => {
  test.skip(!process.env.DEMO_PASSWORD, 'DEMO_PASSWORD not set — skipping demo teacher check');

  // This check only ever reads — drop any write a page's own mount effects attempt.
  await page.route('**/rest/v1/**', (route) => {
    const method = route.request().method();
    return method === 'GET' || method === 'HEAD' ? route.continue() : route.abort();
  });

  await signIn(page, 'demo-teacher', process.env.DEMO_PASSWORD);

  await page.goto('/group');
  await page.getByText('Demo group', { exact: false }).click();
  await page.waitForURL(/\/group\/[^/?]+/);
  const groupId = new URL(page.url()).pathname.split('/')[2];

  await page.goto(`/group/${groupId}?tab=learners`);
  for (const persona of DEMO_PERSONAS) {
    await expect(page.getByText(persona.displayName, { exact: true }).first()).toBeVisible();
  }
  await page.screenshot({ path: 'test-results/demo-shots/teacher-group.png', fullPage: true });

  const deckId = demoUuid(DEMO_DECK_KEY);
  await page.goto(`/group/${groupId}/handout/${deckId}`);
  const mondayRow = page
    .getByText(MONDAY_WORD, { exact: true })
    .first()
    .locator('..')
    .locator('..');
  const trickyChip = mondayRow.getByText(/tricky$/);
  await expect(trickyChip).toBeVisible();
  const trickyText = await trickyChip.innerText();
  const trickyCount = Number(trickyText.match(/\d+/)?.[0] ?? '0');
  expect(trickyCount).toBeGreaterThanOrEqual(2);
  await page.screenshot({ path: 'test-results/demo-shots/teacher-handout.png', fullPage: true });

  const maya = DEMO_PERSONAS.find((p) => p.key === 'maya')!;
  await page
    .getByRole('link', { name: `Open ${maya.displayName}'s page` })
    .first()
    .click();
  await page.waitForURL(new RegExp(`/group/${groupId}/members/`));
  await page.screenshot({ path: 'test-results/demo-shots/teacher-learner.png', fullPage: true });
});

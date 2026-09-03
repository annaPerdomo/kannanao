import fs from 'node:fs';
import path from 'node:path';

import { defineConfig, devices } from '@playwright/test';

// Playwright doesn't read .env: hand the QA-account vars (SHOT_*/E2E_*) to the
// env-gated specs without pulling the app's secrets into this process.
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?((?:SHOT_|E2E_)[A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const raw = m[2].trim();
    const quoted = /^(["']).*\1$/.test(raw);
    process.env[m[1]] ??= quoted ? raw.slice(1, -1) : raw.replace(/\s+#.*$/, '');
  }
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Chromium and WebKit disagree on flex/aspect-ratio and on line breaking:
    // the card once rendered 0px wide, and the greeting ran off the hero, on iOS only.
    {
      name: 'webkit-mobile',
      use: { ...devices['iPhone 12'] },
      testMatch: /card-layout|mobile-layout/,
    },
  ],
});

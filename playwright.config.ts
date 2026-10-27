import { defineConfig, devices } from '@playwright/test';

/**
 * E2E configuration.
 *
 * Playwright is not a dependency of this repository by default (it downloads
 * browsers). Install it before running:
 *
 *   npm i -D @playwright/test && npx playwright install chromium
 *   npm run test:e2e
 *
 * The suite runs against the Vite dev server with the local demo backend, so no
 * Supabase credentials are required.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});

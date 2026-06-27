import { defineConfig, devices } from '@playwright/test';

// When PLAYWRIGHT_BASE_URL is set (e.g. the live Vercel alias) we test that URL
// directly and do NOT start a local dev server.
const liveURL = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 30_000 },
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }], ['list']],
  use: {
    baseURL: liveURL ?? `http://localhost:${process.env.PORT ?? 3001}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile-375',
      use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 812 } },
    },
  ],
  webServer: liveURL
    ? undefined
    : {
        command: 'pnpm dev',
        url: `http://localhost:${process.env.PORT ?? 3001}`,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});

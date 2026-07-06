import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://localhost';

export default defineConfig({
  testDir: './tests',
  globalSetup: './setup/global-setup.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'api',
      testMatch: /api\/.*\.api\.spec\.ts/
    },
    {
      name: 'chromium',
      testIgnore: /api\/.*\.api\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] }
    },
    // {
    //   name: 'firefox',
    //   testIgnore: /api\/.*\.api\.spec\.ts/,
    //   use: { ...devices['Desktop Firefox'] }
    // },
    // {
    //   name: 'webkit',
    //   testIgnore: /api\/.*\.api\.spec\.ts/,
    //   use: { ...devices['Desktop Safari'] }
    // }
  ]
});

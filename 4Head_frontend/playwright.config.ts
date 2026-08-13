import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './playwright',
  timeout: 60_000,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: '../qa-artifacts/playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    channel: 'chrome',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off',
  },
  outputDir: '../qa-artifacts/playwright-results',
});

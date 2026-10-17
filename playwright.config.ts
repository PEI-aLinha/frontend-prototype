import { defineConfig, devices } from '@playwright/test'

const isCI = !!process.env.CI

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // CI runners have 2 cores: more workers starve the browser and make toast-timing assertions flaky.
  workers: isCI ? 2 : undefined,
  retries: isCI ? 1 : 0,
  reporter: 'list',
  use: { baseURL: 'http://localhost:5173', trace: 'retain-on-failure' },
  // CI serves the production build: no cold on-demand module transforms under load.
  webServer: { command: isCI ? 'npm run build && npm run preview -- --port 5173 --strictPort' : 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: !isCI, timeout: 120_000 },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
})

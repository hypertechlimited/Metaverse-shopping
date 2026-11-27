import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/golden',
  timeout: 60000,
  workers: 1,
  use: {
    baseURL: 'http://localhost:8000',
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: 'python3 -m http.server 8000',
    port: 8000,
    reuseExistingServer: true,
    timeout: 30000,
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});

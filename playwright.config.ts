import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 180_000,
  projects: [
    {
      name: 'root',
      testMatch: 'smoke.spec.ts',
      use: { baseURL: 'http://127.0.0.1:4173' },
      webServer: {
        command: 'npm run build && npm run preview -- --port 4173 --host 127.0.0.1 --strictPort',
        url: 'http://127.0.0.1:4173',
        reuseExistingServer: !process.env.CI,
        timeout: 180_000
      }
    },
    {
      name: 'base-path',
      testMatch: 'base-path.spec.ts',
      use: { baseURL: 'http://127.0.0.1:4174/backlog' },
      webServer: {
        command:
          'BASE_PATH=/backlog OUT_DIR=build-base npm run build && node scripts/serve-static.mjs build-base 4174 /backlog',
        url: 'http://127.0.0.1:4174/backlog/',
        reuseExistingServer: !process.env.CI,
        timeout: 180_000
      }
    }
  ]
});

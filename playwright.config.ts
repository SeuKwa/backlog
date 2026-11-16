import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 180_000,
  webServer: {
    command:
      'npm run build && npm run build:base && (node scripts/serve-static.mjs build 4173 & node scripts/serve-static.mjs build-base 4174 /backlog & wait)',
    url: 'http://127.0.0.1:4173/',
    reuseExistingServer: !process.env.CI,
    timeout: 240_000
  },
  projects: [
    {
      name: 'root',
      testMatch: 'smoke.spec.ts',
      use: { baseURL: 'http://127.0.0.1:4173' }
    },
    {
      name: 'base-path',
      testMatch: 'base-path.spec.ts',
      use: { baseURL: 'http://127.0.0.1:4174/backlog' }
    }
  ]
});

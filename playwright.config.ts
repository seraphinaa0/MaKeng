import { defineConfig, devices } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const testDb = join(mkdtempSync(join(tmpdir(), "makeng-e2e-")), "test.sqlite");
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command:
      'pnpm exec concurrently -k "pnpm --filter @makeng/web exec next dev --hostname 127.0.0.1 --port 3100" "pnpm worker"',
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      MAKENG_DB_PATH: testDb,
      NEXT_TELEMETRY_DISABLED: "1",
      NEXT_PUBLIC_MAKENG_DEMO: "false",
    },
  },
});

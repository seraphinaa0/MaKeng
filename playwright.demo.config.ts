import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/demo-e2e",
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: "http://127.0.0.1:3400",
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
      "pnpm --filter @makeng/web exec next start --hostname 127.0.0.1 --port 3400",
    url: "http://127.0.0.1:3400",
    reuseExistingServer: false,
  },
});

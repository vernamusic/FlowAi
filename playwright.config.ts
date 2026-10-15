import { defineConfig, devices } from "@playwright/test";

/**
 * End to end tests run against a production build, because that is what
 * users get, and against an isolated port so they never fight with a dev
 * server.
 */
const port = 3100;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",

  fullyParallel: true,

  forbidOnly: Boolean(process.env.CI),

  retries: process.env.CI ? 2 : 0,

  reporter: [["list"]],

  timeout: 60_000,

  use: {
    baseURL,

    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    /**
     * Built before the tests run, so they always exercise the current
     * code instead of whatever was compiled last.
     */
    command: `npm run build && npx next start -p ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  fullyParallel: true,
  workers: 4,
  timeout: 30000,
  use: {
    baseURL: "http://127.0.0.1:4192",
    channel: "chrome",
    trace: "retain-on-failure",
  },
  projects: ["dark", "light"].flatMap((theme) => [
    {
      name: `desktop-${theme}`,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 900 },
        colorScheme: theme as "dark" | "light",
      },
    },
    {
      name: `mobile-${theme}`,
      use: {
        ...devices["Pixel 7"],
        viewport: { width: 390, height: 844 },
        defaultBrowserType: "chromium" as const,
        channel: "chrome",
        colorScheme: theme as "dark" | "light",
      },
    },
  ]),
  webServer: [
    {
      command:
        "HYDRATION_DETAILS=true npm run build && PORT=4192 npm run preview",
      url: "http://127.0.0.1:4192",
      timeout: 120000,
      reuseExistingServer: false,
    },
    {
      command: "PORT=4193 HMR_PORT=24679 npm run dev",
      url: "http://127.0.0.1:4193",
      timeout: 60000,
      reuseExistingServer: false,
    },
  ],
});

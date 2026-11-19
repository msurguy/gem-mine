import { defineConfig } from "@playwright/test";
const baseURL = process.env.GEM_MINE_BASE_URL || "http://127.0.0.1:5174";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  use: {
    baseURL,
    browserName: "chromium",
    channel: "chrome",
    headless: true,
    viewport: { width: 1440, height: 1000 },
  },
  webServer: process.env.GEM_MINE_BASE_URL
    ? undefined
    : {
        command: "npm run dev -- --port 5174 --strictPort",
        url: baseURL,
        reuseExistingServer: true,
      },
  reporter: "list",
});

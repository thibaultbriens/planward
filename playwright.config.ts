// SPDX-License-Identifier: AGPL-3.0-or-later
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: "http://localhost:3000", browserName: "chromium" },
  webServer: {
    command: "./node_modules/.bin/next dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    env: {
      ADMIN_PASSWORD: "e2e-only-password",
      SESSION_SECRET: "e2e-only-session-secret",
      DATABASE_URL: "postgres://planward:e2e-only-password@127.0.0.1:5432/planward",
    },
  },
});

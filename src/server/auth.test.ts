// SPDX-License-Identifier: AGPL-3.0-or-later
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("authentication configuration", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.ADMIN_PASSWORD;
    delete process.env.ADMIN_PASSWORD_HASH;
    delete process.env.SESSION_SECRET;
  });

  it("refuses an incomplete authentication configuration", async () => {
    const { assertAuthenticationConfigured } = await import("./auth");
    expect(assertAuthenticationConfigured).toThrow("ADMIN_PASSWORD_HASH or ADMIN_PASSWORD must be configured.");
  });

  it("accepts a development password only with a session secret", async () => {
    process.env.ADMIN_PASSWORD = "development-only";
    process.env.SESSION_SECRET = "a-test-secret";
    const { assertAuthenticationConfigured, verifyAdminPassword } = await import("./auth");
    expect(assertAuthenticationConfigured).not.toThrow();
    await expect(verifyAdminPassword("development-only")).resolves.toBe(true);
    await expect(verifyAdminPassword("incorrect")).resolves.toBe(false);
  });
});

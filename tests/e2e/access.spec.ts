// SPDX-License-Identifier: AGPL-3.0-or-later
import { expect, test } from "@playwright/test";

test("public visitor sees the project in read-only mode", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Lecture seule")).toBeVisible();
  await expect(page.getByRole("button", { name: "+ Activité" })).toBeDisabled();
  await expect(page.getByRole("tab", { name: "Timeline" })).toBeVisible();
});

test("administrator can open an editing session", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Connexion" }).click();
  await page.getByLabel("Mot de passe").fill("e2e-only-password");
  await page.locator("form").getByRole("button", { name: "Connexion", exact: true }).click();
  await expect(page.getByText("Édition")).toBeVisible();
  await expect(page.getByRole("button", { name: "+ Activité" })).toBeEnabled();
});

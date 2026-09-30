// SPDX-License-Identifier: AGPL-3.0-or-later
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  // Generation is offline; live database commands still require DATABASE_URL at runtime.
  dbCredentials: { url: process.env.DATABASE_URL ?? "postgres://planward:planward@localhost:5432/planward" },
});

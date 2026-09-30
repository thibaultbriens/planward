// SPDX-License-Identifier: AGPL-3.0-or-later
import { migrateEchoPmV1 } from "./legacy";
import type { PlanwardDocument } from "./schema";
import { validatePlanward } from "./validation";

export function importProjectDocument(input: unknown): PlanwardDocument {
  if (input !== null && typeof input === "object" && (input as { format?: unknown }).format === "echo-pm") {
    return migrateEchoPmV1(input);
  }
  return validatePlanward(input);
}

export function exportProjectDocument(document: PlanwardDocument, exportedAt: string): PlanwardDocument {
  return validatePlanward({ ...document, format: "planward", version: 1, exportedAt });
}

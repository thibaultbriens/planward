// SPDX-License-Identifier: AGPL-3.0-or-later
import legacyEchoGloves from "../../../examples/echogloves.json";
import { describe, expect, it } from "vitest";
import { exportProjectDocument, importProjectDocument } from "./index";
import { ProjectFormatError, validatePlanward } from "./validation";

describe("EchoGloves legacy import", () => {
  const imported = importProjectDocument(legacyEchoGloves);

  it("preserves the supplied regression fixture", () => {
    expect(imported.format).toBe("planward");
    expect(Object.keys(imported.sections)).toHaveLength(11);
    expect(Object.keys(imported.activities)).toHaveLength(62);
    expect(Object.keys(imported.milestones)).toHaveLength(4);
    expect(Object.keys(imported.deps)).toHaveLength(108);
    expect(Object.keys(imported.resources)).toHaveLength(6);
    expect(Object.values(imported.activities).reduce((total, activity) => total + activity.estimate, 0)).toBe(442.5);
  });

  it("keeps activity 97's historic duration through Christmas", () => {
    expect(imported.activities["97"].dur).toBe(74);
    expect(imported.activities["97"].start).toBe("2026-09-14");
    expect(imported.activities["97"].end).toBe("2027-01-07");
  });

  it("reconstructs every absent historic duration from raw weekdays", () => {
    const absent = Object.values(legacyEchoGloves.activities).filter((activity) => !("dur" in activity));
    expect(absent).toHaveLength(22);
    for (const activity of absent) expect(imported.activities[activity.id].dur).toBeGreaterThan(0);
  });

  it("round-trips through the public Planward format", () => {
    const exported = exportProjectDocument(imported, "2026-09-24T20:54:53.576Z");
    expect(importProjectDocument(exported)).toEqual(exported);
  });
});

describe("Planward format validation", () => {
  it("rejects unknown references with an actionable path", () => {
    const invalid = structuredClone(importProjectDocument(legacyEchoGloves));
    invalid.activities["1"].owner = "not-a-resource";
    expect(() => validatePlanward(invalid)).toThrow(ProjectFormatError);
    try {
      validatePlanward(invalid);
    } catch (error) {
      expect(error).toBeInstanceOf(ProjectFormatError);
      expect((error as ProjectFormatError).problems).toContain('activities.1.owner: unknown resource “not-a-resource”');
    }
  });
});

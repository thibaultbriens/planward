// SPDX-License-Identifier: AGPL-3.0-or-later
import echoGloves from "../../examples/echogloves.json";
import { describe, expect, it } from "vitest";
import { projectLoads, weeklyCapacity } from "./capacity";
import { importProjectDocument } from "./format";
import { optimizeSchedule } from "./optimizer";
import { dependencyViolation } from "./schedule";

describe("resource-levelled optimizer", () => {
  it("stretches work when a one-day estimate cannot fit the daily ceiling", () => {
    const state = {
      calendar: { weekDays: [1, 2, 3, 4, 5], holidays: {} },
      sections: { s: { id: "s", name: "S", code: "", owner: "r", order: 1, priority: 1, kind: "activities" as const } },
      resources: { r: { id: "r", name: "R", team: "", initials: "R", color: "#123456", order: 0, defaultCap: 5, cap: {} } },
      activities: { a: { id: "a", name: "A", code: "", section: "s", wbs: "1", status: "recorded" as const, owner: "r", start: "2026-10-05", end: "2026-10-05", dur: 1, estimate: 2, desc: "", assign: { r: { planned: 2, actual: 0, remaining: 2 } } } },
      milestones: {}, deps: {},
    };
    const result = optimizeSchedule(state, { threshold: 100, from: "2026-10-05", freezeStarted: false, allowStretch: true, useSectionPriority: true });
    expect(result.stretched).toEqual(["a"]);
    expect(result.draft.a.dur).toBe(2);
    expect(result.overThreshold).toEqual([]);
  });

  it("respects capacity and dependencies across the EchoGloves fixture", () => {
    const document = importProjectDocument(echoGloves);
    const state = { ...document, calendar: { weekDays: document.meta.project.weekDays, holidays: document.holidays } };
    const result = optimizeSchedule(state, { threshold: 100, from: "2026-09-07", freezeStarted: false, allowStretch: true, useSectionPriority: true });
    expect(result.overThreshold).toEqual([]);
    for (const dependency of Object.values(document.deps).filter((dependency) => document.activities[dependency.to])) {
      expect(dependencyViolation(dependency, state, result.draft), dependency.id).toBe(false);
    }
    // Milestones remain fixed by design. M4's legacy predecessor chain ends after its fixed date.
    expect(dependencyViolation(document.deps["209"], state, result.draft)).toBe(true);
    const loads = projectLoads(document, state.calendar, result.draft);
    for (const resource of Object.values(document.resources)) {
      for (const [week, load] of Object.entries(loads[resource.id] ?? {})) {
        expect(load).toBeLessThanOrEqual(weeklyCapacity(resource, week, state.calendar) + 0.000001);
      }
    }
  });
});

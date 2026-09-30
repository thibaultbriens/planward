// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { activityLoadByWeek, weeklyCapacity } from "./capacity";
import type { PlanwardDocument } from "./types";

const calendar = { weekDays: [1, 2, 3, 4, 5], holidays: {
  absence: { id: "absence", name: "Absence", start: "2026-10-07", end: "2026-10-07", who: "r" },
} };
const activity: PlanwardDocument["activities"][string] = {
  id: "a", name: "A", code: "", section: "s", wbs: "1", status: "recorded", owner: "r",
  start: "2026-10-05", end: "2026-10-09", dur: 5, estimate: 10, desc: "",
  assign: { r: { planned: 10, actual: 0, remaining: 10 } },
};

describe("capacity", () => {
  it("spreads assigned hours uniformly over working days then ISO weeks", () => {
    expect(activityLoadByWeek(activity, calendar)).toEqual({ r: { "2026-10-05": 10 } });
  });

  it("reduces default capacity for resource absences but retains manual overrides", () => {
    const resource: PlanwardDocument["resources"][string] = { id: "r", name: "R", team: "", initials: "R", color: "#123456", order: 0, defaultCap: 10, cap: {} };
    expect(weeklyCapacity(resource, "2026-10-05", calendar)).toBe(8);
    resource.cap["2026-10-05"] = 12;
    expect(weeklyCapacity(resource, "2026-10-05", calendar)).toBe(12);
  });
});

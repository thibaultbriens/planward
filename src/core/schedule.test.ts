// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { cascadeForward, dependencyViolation } from "./schedule";
import type { ScheduleState } from "./types";

const state: ScheduleState = {
  calendar: { weekDays: [1, 2, 3, 4, 5], holidays: {} },
  activities: {
    a: { id: "a", name: "A", code: "", section: "s", wbs: "1", status: "recorded", owner: "r", start: "2026-10-05", end: "2026-10-06", dur: 2, estimate: 2, desc: "", assign: {} },
    b: { id: "b", name: "B", code: "", section: "s", wbs: "2", status: "recorded", owner: "r", start: "2026-10-06", end: "2026-10-06", dur: 1, estimate: 1, desc: "", assign: {} },
    c: { id: "c", name: "C", code: "", section: "s", wbs: "3", status: "recorded", owner: "r", start: "2026-10-07", end: "2026-10-07", dur: 1, estimate: 1, desc: "", assign: {} },
  },
  milestones: {},
  deps: {
    ab: { id: "ab", from: "a", to: "b", lag: 0 },
    bc: { id: "bc", from: "b", to: "c", lag: 0 },
  },
};

describe("forward cascade", () => {
  it("moves only downstream activities and preserves duration", () => {
    const draft = cascadeForward(state, ["a"], { a: { start: "2026-10-08", end: "2026-10-09", dur: 2 } });
    expect(draft.b).toEqual({ start: "2026-10-12", end: "2026-10-12", dur: 1 });
    expect(draft.c).toEqual({ start: "2026-10-13", end: "2026-10-13", dur: 1 });
  });

  it("detects a violated finish-start dependency", () => {
    expect(dependencyViolation(state.deps.ab, state)).toBe(true);
  });
});

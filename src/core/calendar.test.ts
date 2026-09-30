// SPDX-License-Identifier: AGPL-3.0-or-later
import { describe, expect, it } from "vitest";
import { endForDuration, workdaysBetween } from "./calendar";
import type { CalendarSettings } from "./types";

const calendar: CalendarSettings = {
  weekDays: [1, 2, 3, 4, 5],
  holidays: {
    christmas: { id: "christmas", name: "Vacances de Noël", start: "2026-12-19", end: "2027-01-03", who: "" },
  },
};

describe("working calendar", () => {
  it("keeps duration and moves an activity past Christmas closure", () => {
    expect(endForDuration("2026-12-17", 3, calendar)).toBe("2027-01-04");
    expect(workdaysBetween("2026-12-17", "2027-01-04", calendar)).toHaveLength(3);
  });

  it("matches EchoGloves activity 97's stored duration", () => {
    expect(workdaysBetween("2026-09-14", "2027-01-07", calendar)).toHaveLength(74);
  });
});

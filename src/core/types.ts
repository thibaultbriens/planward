// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Activity, Dependency, Milestone, PlanwardDocument } from "./format/schema";

export type DateString = string;
export type CalendarSettings = Pick<PlanwardDocument["meta"]["project"], "weekDays"> & {
  holidays: PlanwardDocument["holidays"];
};
export type ScheduleState = Pick<PlanwardDocument, "activities" | "milestones" | "deps"> & {
  calendar: CalendarSettings;
};
export type ActivityDates = Pick<Activity, "start" | "end" | "dur">;
export type MilestoneDates = { start: DateString; end: DateString };
export type ScheduleDraft = Record<string, ActivityDates | MilestoneDates>;
export type { Activity, Dependency, Milestone, PlanwardDocument };

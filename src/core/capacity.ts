// SPDX-License-Identifier: AGPL-3.0-or-later
import { addCalendarDays, isoMonday, isResourceAbsent, isWorkingDay, workdaysBetween } from "./calendar";
import type { ActivityDates, CalendarSettings, DateString, PlanwardDocument } from "./types";

export type WeeklyLoad = Record<string, Record<DateString, number>>;

export function activityLoadByWeek(
  activity: PlanwardDocument["activities"][string],
  calendar: CalendarSettings,
  dates: ActivityDates = activity,
): Record<string, Record<DateString, number>> {
  const days = workdaysBetween(dates.start, dates.end, calendar);
  if (days.length === 0 || activity.status === "cancelled") return {};
  const result: Record<string, Record<DateString, number>> = {};
  for (const [resourceId, assignment] of Object.entries(activity.assign)) {
    const perDay = assignment.planned / days.length;
    if (perDay === 0) continue;
    const weeks = (result[resourceId] ??= {});
    for (const day of days) {
      const week = isoMonday(day);
      weeks[week] = (weeks[week] ?? 0) + perDay;
    }
  }
  return result;
}

export function projectLoads(
  document: Pick<PlanwardDocument, "activities">,
  calendar: CalendarSettings,
  overrides: Record<string, ActivityDates> = {},
): WeeklyLoad {
  const result: WeeklyLoad = {};
  for (const activity of Object.values(document.activities)) {
    for (const [resourceId, weeks] of Object.entries(activityLoadByWeek(activity, calendar, overrides[activity.id]))) {
      const resource = (result[resourceId] ??= {});
      for (const [week, hours] of Object.entries(weeks)) resource[week] = (resource[week] ?? 0) + hours;
    }
  }
  return result;
}

export function openDaysInWeek(resourceId: string, monday: DateString, calendar: CalendarSettings): number {
  let count = 0;
  for (let day = monday; day <= addCalendarDays(monday, 6); day = addCalendarDays(day, 1)) {
    if (isWorkingDay(day, calendar) && !isResourceAbsent(day, resourceId, calendar)) count += 1;
  }
  return count;
}

export function weeklyCapacity(
  resource: PlanwardDocument["resources"][string],
  monday: DateString,
  calendar: CalendarSettings,
): number {
  const override = resource.cap[monday];
  if (override !== undefined) return override;
  return (resource.defaultCap * openDaysInWeek(resource.id, monday, calendar)) / calendar.weekDays.length;
}

export function occupancy(load: number, capacity: number): number {
  if (capacity === 0) return load === 0 ? 0 : Number.POSITIVE_INFINITY;
  return load / capacity;
}

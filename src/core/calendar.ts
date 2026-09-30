// SPDX-License-Identifier: AGPL-3.0-or-later
import type { CalendarSettings, DateString } from "./types";

function utcDate(value: DateString): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function toDateString(value: Date): DateString {
  return value.toISOString().slice(0, 10);
}

export function addCalendarDays(date: DateString, days: number): DateString {
  const result = utcDate(date);
  result.setUTCDate(result.getUTCDate() + days);
  return toDateString(result);
}

export function dayOfWeek(date: DateString): number {
  return utcDate(date).getUTCDay();
}

export function isoMonday(date: DateString): DateString {
  const day = dayOfWeek(date);
  return addCalendarDays(date, day === 0 ? -6 : 1 - day);
}

export function isProjectHoliday(date: DateString, calendar: CalendarSettings): boolean {
  return Object.values(calendar.holidays).some(
    (holiday) => holiday.who === "" && holiday.start <= date && date <= holiday.end,
  );
}

export function isResourceAbsent(date: DateString, resourceId: string, calendar: CalendarSettings): boolean {
  return Object.values(calendar.holidays).some(
    (holiday) => holiday.who === resourceId && holiday.start <= date && date <= holiday.end,
  );
}

export function isWorkingDay(date: DateString, calendar: CalendarSettings): boolean {
  return calendar.weekDays.includes(dayOfWeek(date)) && !isProjectHoliday(date, calendar);
}

export function nextWorkingDay(date: DateString, calendar: CalendarSettings): DateString {
  let result = date;
  while (!isWorkingDay(result, calendar)) result = addCalendarDays(result, 1);
  return result;
}

export function previousWorkingDay(date: DateString, calendar: CalendarSettings): DateString {
  let result = date;
  while (!isWorkingDay(result, calendar)) result = addCalendarDays(result, -1);
  return result;
}

export function addWorkdays(date: DateString, workdays: number, calendar: CalendarSettings): DateString {
  let result = workdays >= 0 ? nextWorkingDay(date, calendar) : previousWorkingDay(date, calendar);
  const direction = workdays >= 0 ? 1 : -1;
  let remaining = Math.abs(workdays);
  while (remaining > 0) {
    result = addCalendarDays(result, direction);
    if (isWorkingDay(result, calendar)) remaining -= 1;
  }
  return result;
}

export function workdaysBetween(start: DateString, end: DateString, calendar: CalendarSettings): DateString[] {
  if (end < start) return [];
  const values: DateString[] = [];
  for (let date = start; date <= end; date = addCalendarDays(date, 1)) {
    if (isWorkingDay(date, calendar)) values.push(date);
  }
  return values;
}

export function endForDuration(start: DateString, durationDays: number, calendar: CalendarSettings): DateString {
  return addWorkdays(start, Math.max(1, durationDays) - 1, calendar);
}

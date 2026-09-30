// SPDX-License-Identifier: AGPL-3.0-or-later
import { addWorkdays, endForDuration, isoMonday, isResourceAbsent, isWorkingDay } from "./calendar";
import type { ActivityDates, DateString, PlanwardDocument, ScheduleState } from "./types";
import { openDaysInWeek, weeklyCapacity } from "./capacity";

export type OptimizerOptions = {
  threshold: number;
  from: DateString;
  freezeStarted: boolean;
  allowStretch: boolean;
  useSectionPriority: boolean;
  horizonDays?: number;
};

export type OptimizerResult = {
  draft: Record<string, ActivityDates>;
  stretched: string[];
  overThreshold: string[];
  frozen: string[];
};

type OptimizerState = Pick<PlanwardDocument, "activities" | "milestones" | "deps" | "resources" | "sections"> & {
  calendar: ScheduleState["calendar"];
};

function buildDays(from: DateString, count: number, state: OptimizerState): DateString[] {
  const days: DateString[] = [];
  let date = from;
  while (days.length < count) {
    if (isWorkingDay(date, state.calendar)) days.push(date);
    date = addWorkdays(date, 1, state.calendar);
  }
  return days;
}

function isFrozen(activity: PlanwardDocument["activities"][string]): boolean {
  return activity.status === "done" || activity.status === "cancelled" || activity.status === "inprogress" ||
    Object.values(activity.assign).some((assignment) => assignment.actual > 0);
}

function sectionPriority(state: OptimizerState, sectionId: string): number {
  return state.sections[sectionId]?.priority ?? Number.MAX_SAFE_INTEGER;
}

export function optimizeSchedule(state: OptimizerState, options: OptimizerOptions): OptimizerResult {
  const activities = Object.values(state.activities).filter((activity) => activity.status !== "cancelled");
  const byId = Object.fromEntries(activities.map((activity) => [activity.id, activity]));
  const frozen = new Set(options.freezeStarted ? activities.filter(isFrozen).map((activity) => activity.id) : []);
  const days = buildDays(options.from, options.horizonDays ?? 700, state);
  const dayIndex = new Map(days.map((day, index) => [day, index]));
  const budget: Record<string, number[]> = {};
  const budgetFor = (resourceId: string): number[] => {
    const values = budget[resourceId];
    if (values) return values;
    const resource = state.resources[resourceId];
    const generated = days.map((day) => {
      if (!resource || isResourceAbsent(day, resourceId, state.calendar)) return 0;
      const mondayString = isoMonday(day);
      const openDays = openDaysInWeek(resourceId, mondayString, state.calendar);
      return openDays === 0 ? 0 : (weeklyCapacity(resource, mondayString, state.calendar) * options.threshold) / 100 / openDays;
    });
    budget[resourceId] = generated;
    return generated;
  };
  const spend = (activity: PlanwardDocument["activities"][string], start: DateString, duration: number): void => {
    const startIndex = dayIndex.get(start);
    if (startIndex === undefined) return;
    for (const [resourceId, assignment] of Object.entries(activity.assign)) {
      const perDay = assignment.planned / duration;
      const values = budgetFor(resourceId);
      for (let day = 0; day < duration && startIndex + day < values.length; day += 1) values[startIndex + day] -= perDay;
    }
  };
  const fits = (activity: PlanwardDocument["activities"][string], startIndex: number, duration: number): boolean => {
    if (startIndex + duration > days.length) return false;
    for (const [resourceId, assignment] of Object.entries(activity.assign)) {
      const perDay = assignment.planned / duration;
      const values = budgetFor(resourceId);
      for (let day = 0; day < duration; day += 1) if (values[startIndex + day] + 1e-8 < perDay) return false;
    }
    return true;
  };
  const plans: Record<string, ActivityDates> = {};
  for (const activity of activities) {
    if (!frozen.has(activity.id)) continue;
    const start = addWorkdays(activity.start, 0, state.calendar);
    plans[activity.id] = { start, end: endForDuration(start, activity.dur, state.calendar), dur: activity.dur };
    spend(activity, start, activity.dur);
  }
  const successors = new Map<string, string[]>();
  for (const dependency of Object.values(state.deps)) {
    const values = successors.get(dependency.from) ?? [];
    values.push(dependency.to);
    successors.set(dependency.from, values);
  }
  const depth = new Map<string, number>();
  const chainLength = (id: string): number => {
    const known = depth.get(id);
    if (known !== undefined) return known;
    const length = Math.max(0, ...(successors.get(id) ?? []).map((successor) => {
      const activity = byId[successor];
      return (activity?.dur ?? 0) + chainLength(successor);
    }));
    depth.set(id, length);
    return length;
  };
  const pending = activities.filter((activity) => !frozen.has(activity.id));
  const done = new Set(Object.keys(plans));
  const earliestStart = (activityId: string): DateString => {
    let date = options.from;
    for (const dependency of Object.values(state.deps).filter((entry) => entry.to === activityId)) {
      const predecessorDates = plans[dependency.from];
      const predecessorActivity = state.activities[dependency.from];
      const predecessorMilestone = state.milestones[dependency.from];
      const end = predecessorDates?.end ?? predecessorActivity?.end ?? predecessorMilestone?.date;
      if (!end) continue;
      const next = predecessorMilestone ? addWorkdays(end, dependency.lag, state.calendar) : addWorkdays(end, dependency.lag + 1, state.calendar);
      if (next > date) date = next;
    }
    return addWorkdays(date, 0, state.calendar);
  };
  const stretched: string[] = [];
  const overThreshold: string[] = [];
  while (pending.length > 0) {
    const ready = pending.filter((activity) => Object.values(state.deps)
      .filter((dependency) => dependency.to === activity.id)
      .every((dependency) => !byId[dependency.from] || done.has(dependency.from)));
    const candidates = ready.length > 0 ? ready : [pending[0]];
    candidates.sort((left, right) =>
      (options.useSectionPriority ? sectionPriority(state, left.section) - sectionPriority(state, right.section) : 0) ||
      chainLength(right.id) - chainLength(left.id) ||
      earliestStart(left.id).localeCompare(earliestStart(right.id)) || left.wbs.localeCompare(right.wbs),
    );
    const activity = candidates[0];
    pending.splice(pending.indexOf(activity), 1);
    const earliest = earliestStart(activity.id);
    const startAt = dayIndex.get(earliest) ?? 0;
    let placement: { index: number; duration: number } | undefined;
    for (let index = startAt; index < days.length && !placement; index += 1) {
      if (fits(activity, index, activity.dur)) placement = { index, duration: activity.dur };
    }
    if (!placement && options.allowStretch) {
      const maximumDuration = Math.min(120, Math.max(activity.dur + 20, activity.dur * 10));
      for (let index = startAt; index < days.length && !placement; index += 1) {
        for (let duration = activity.dur + 1; duration <= maximumDuration && !placement; duration += 1) {
          if (fits(activity, index, duration)) placement = { index, duration };
        }
      }
    }
    if (!placement) {
      placement = { index: Math.min(startAt, days.length - 1), duration: activity.dur };
      overThreshold.push(activity.id);
    }
    const start = days[placement.index];
    plans[activity.id] = { start, end: endForDuration(start, placement.duration, state.calendar), dur: placement.duration };
    spend(activity, start, placement.duration);
    if (placement.duration !== activity.dur) stretched.push(activity.id);
    done.add(activity.id);
  }
  const draft: Record<string, ActivityDates> = {};
  for (const [id, plan] of Object.entries(plans)) {
    const activity = state.activities[id];
    if (activity && (activity.start !== plan.start || activity.end !== plan.end || activity.dur !== plan.dur)) draft[id] = plan;
  }
  return { draft, stretched, overThreshold, frozen: [...frozen] };
}

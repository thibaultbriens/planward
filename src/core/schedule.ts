// SPDX-License-Identifier: AGPL-3.0-or-later
import { addWorkdays, endForDuration, nextWorkingDay } from "./calendar";
import type { ActivityDates, DateString, MilestoneDates, ScheduleDraft, ScheduleState } from "./types";

function activityDates(activity: ActivityDates, draft: ScheduleDraft, id: string): ActivityDates {
  const value = draft[id];
  return value && "dur" in value ? value : activity;
}

function milestoneDates(date: DateString, draft: ScheduleDraft, id: string): MilestoneDates {
  const value = draft[id];
  return value && !("dur" in value) ? value : { start: date, end: date };
}

export function requiredSuccessorStart(
  predecessorId: string,
  state: ScheduleState,
  draft: ScheduleDraft = {},
  lagDays = 0,
): DateString | null {
  const activity = state.activities[predecessorId];
  const milestone = state.milestones[predecessorId];
  if (!activity && !milestone) return null;
  const end = activity
    ? activityDates(activity, draft, predecessorId).end
    : milestoneDates(milestone.date, draft, predecessorId).end;
  const first = milestone ? nextWorkingDay(end, state.calendar) : addWorkdays(end, 1, state.calendar);
  return lagDays === 0 ? first : addWorkdays(first, lagDays, state.calendar);
}

export function dependencyViolation(
  dependency: ScheduleState["deps"][string],
  state: ScheduleState,
  draft: ScheduleDraft = {},
): boolean {
  const targetActivity = state.activities[dependency.to];
  const targetMilestone = state.milestones[dependency.to];
  if (!targetActivity && !targetMilestone) return false;
  if (targetMilestone) {
    const predecessor = state.activities[dependency.from]
      ? activityDates(state.activities[dependency.from], draft, dependency.from).end
      : state.milestones[dependency.from]
        ? milestoneDates(state.milestones[dependency.from].date, draft, dependency.from).end
        : null;
    return predecessor !== null && milestoneDates(targetMilestone.date, draft, dependency.to).start < predecessor;
  }
  const required = requiredSuccessorStart(dependency.from, state, draft, dependency.lag);
  return required !== null && activityDates(targetActivity, draft, dependency.to).start < required;
}

export function cascadeForward(state: ScheduleState, roots: string[], initial: ScheduleDraft = {}): ScheduleDraft {
  const draft: ScheduleDraft = { ...initial };
  const successors = new Map<string, ScheduleState["deps"][string][]>();
  for (const dependency of Object.values(state.deps)) {
    const values = successors.get(dependency.from) ?? [];
    values.push(dependency);
    successors.set(dependency.from, values);
  }
  const queue = [...roots];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    for (const dependency of successors.get(current) ?? []) {
      const successor = state.activities[dependency.to];
      if (!successor) continue;
      const required = requiredSuccessorStart(dependency.from, state, draft, dependency.lag);
      const currentDates = activityDates(successor, draft, successor.id);
      if (required && currentDates.start < required) {
        draft[successor.id] = {
          start: required,
          end: endForDuration(required, currentDates.dur, state.calendar),
          dur: currentDates.dur,
        };
        queue.push(successor.id);
      }
    }
  }
  return draft;
}

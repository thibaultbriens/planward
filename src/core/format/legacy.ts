// SPDX-License-Identifier: AGPL-3.0-or-later
import type { PlanwardDocument } from "./schema";
import { validatePlanward } from "./validation";

type LegacyRecord = Record<string, unknown>;

function asRecord(value: unknown, name: string): LegacyRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error(`${name} must be an object`);
  return value as LegacyRecord;
}

function value(record: LegacyRecord, key: string, fallback = ""): string {
  const entry = record[key];
  return typeof entry === "string" ? entry : fallback;
}

function numberValue(record: LegacyRecord, key: string, fallback = 0): number {
  const entry = record[key];
  return typeof entry === "number" && Number.isFinite(entry) ? entry : fallback;
}

function weekdayCount(start: string, end: string): number {
  const current = new Date(`${start}T00:00:00.000Z`);
  const last = new Date(`${end}T00:00:00.000Z`);
  let count = 0;
  while (current <= last) {
    const day = current.getUTCDay();
    if (day > 0 && day < 6) count += 1;
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return Math.max(1, count);
}

function optionalString(record: LegacyRecord, key: string): string | undefined {
  const entry = record[key];
  return typeof entry === "string" && entry ? entry : undefined;
}

export function migrateEchoPmV1(input: unknown): PlanwardDocument {
  const source = asRecord(input, "document");
  if (source.format !== "echo-pm" || source.version !== 1) throw new Error("Expected echo-pm version 1");
  const activities = asRecord(source.activities, "activities");
  const milestones = asRecord(source.milestones, "milestones");
  const resources = asRecord(source.resources, "resources");
  const legacySections = asRecord(source.sections, "sections");
  const project = asRecord(asRecord(source.meta, "meta").project, "meta.project");
  const firstDate = Object.values(activities)
    .map((activity) => value(asRecord(activity, "activity"), "start"))
    .filter(Boolean)
    .sort()[0];
  if (!firstDate) throw new Error("meta.project.startDate is absent and no activity has a start date");
  const milestoneSections = new Set(
    Object.values(milestones).map((milestone) => value(asRecord(milestone, "milestone"), "section")),
  );
  const document: PlanwardDocument = {
    format: "planward",
    version: 1,
    exportedAt: value(source, "exportedAt", new Date(0).toISOString()),
    meta: {
      project: {
        id: value(project, "id", "project"),
        name: value(project, "name", "Untitled project"),
        hoursPerDay: numberValue(project, "hoursPerDay", 8),
        startDate: value(project, "startDate", firstDate),
        weekDays: [1, 2, 3, 4, 5],
        autoThreshold: numberValue(project, "autoThreshold", 100),
      },
    },
    sections: Object.fromEntries(Object.entries(legacySections).map(([id, sourceSection]) => {
      const section = asRecord(sourceSection, `sections.${id}`);
      return [id, {
        id: value(section, "id", id), name: value(section, "name"), code: value(section, "code"),
        owner: value(section, "owner"), order: numberValue(section, "order"),
        priority: numberValue(section, "priority", 1),
        kind: milestoneSections.has(id) ? "milestones" : "activities",
        ref: optionalString(section, "ref"),
      }];
    })),
    resources: Object.fromEntries(Object.entries(resources).map(([id, sourceResource]) => {
      const resource = asRecord(sourceResource, `resources.${id}`);
      const cap = asRecord(resource.cap ?? {}, `resources.${id}.cap`);
      return [id, {
        id: value(resource, "id", id), name: value(resource, "name", id), team: value(resource, "team"),
        initials: value(resource, "initials", id.slice(0, 2).toUpperCase()), color: value(resource, "color", "#8196A6"),
        order: numberValue(resource, "order"), defaultCap: numberValue(resource, "defaultCap"),
        cap: Object.fromEntries(Object.entries(cap).map(([week, hours]) => [week, typeof hours === "number" ? hours : 0])),
      }];
    })),
    activities: Object.fromEntries(Object.entries(activities).map(([id, sourceActivity]) => {
      const activity = asRecord(sourceActivity, `activities.${id}`);
      const start = value(activity, "start");
      const end = value(activity, "end");
      const assign = asRecord(activity.assign ?? {}, `activities.${id}.assign`);
      const dur = typeof activity.dur === "number" ? activity.dur : weekdayCount(start, end);
      return [id, {
        id: value(activity, "id", id), name: value(activity, "name"), code: value(activity, "code"),
        section: value(activity, "section"), wbs: value(activity, "wbs"),
        status: value(activity, "status", "recorded") as PlanwardDocument["activities"][string]["status"],
        owner: value(activity, "owner"), start, end, dur, estimate: numberValue(activity, "estimate"), desc: value(activity, "desc"),
        assign: Object.fromEntries(Object.entries(assign).map(([resourceId, sourceAssignment]) => {
          const assignment = asRecord(sourceAssignment, `activities.${id}.assign.${resourceId}`);
          return [resourceId, { planned: numberValue(assignment, "planned"), actual: numberValue(assignment, "actual"), remaining: numberValue(assignment, "remaining") }];
        })), ref: optionalString(activity, "ref"),
      }];
    })),
    milestones: Object.fromEntries(Object.entries(milestones).map(([id, sourceMilestone]) => {
      const milestone = asRecord(sourceMilestone, `milestones.${id}`);
      return [id, {
        id: value(milestone, "id", id), name: value(milestone, "name"), date: value(milestone, "date"),
        owner: value(milestone, "owner"), section: value(milestone, "section"),
        status: value(milestone, "status", "recorded") as PlanwardDocument["milestones"][string]["status"],
        desc: value(milestone, "desc"), ref: optionalString(milestone, "ref"),
      }];
    })),
    deps: Object.fromEntries(Object.entries(asRecord(source.deps, "deps")).map(([id, sourceDependency]) => {
      const dependency = asRecord(sourceDependency, `deps.${id}`);
      return [id, { id: value(dependency, "id", id), from: value(dependency, "from"), to: value(dependency, "to"), lag: numberValue(dependency, "lag") }];
    })),
    holidays: Object.fromEntries(Object.entries(asRecord(source.holidays, "holidays")).map(([id, sourceHoliday]) => {
      const holiday = asRecord(sourceHoliday, `holidays.${id}`);
      return [id, { id: value(holiday, "id", id), name: value(holiday, "name"), start: value(holiday, "start"), end: value(holiday, "end"), who: value(holiday, "who") }];
    })),
  };
  return validatePlanward(document);
}

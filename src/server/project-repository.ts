// SPDX-License-Identifier: AGPL-3.0-or-later
import { eq } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import { activities, assignments, dependencies, holidays, milestones, projectSettings, projects, resourceCapacity, resources, sections } from "@/db/schema";
import { validatePlanward, type PlanwardDocument } from "@/core/format";

const asNumber = (value: string) => Number(value);

export async function getCurrentProject(): Promise<PlanwardDocument | null> {
  const db = getDatabase();
  const [project] = await db.select().from(projects).limit(1);
  if (!project) return null;
  const [settings] = await db.select().from(projectSettings).where(eq(projectSettings.projectId, project.id));
  if (!settings) throw new Error("Project settings are missing.");
  const [sectionRows, resourceRows, activityRows, milestoneRows, dependencyRows, holidayRows] = await Promise.all([
    db.select().from(sections).where(eq(sections.projectId, project.id)),
    db.select().from(resources).where(eq(resources.projectId, project.id)),
    db.select().from(activities).where(eq(activities.projectId, project.id)),
    db.select().from(milestones).where(eq(milestones.projectId, project.id)),
    db.select().from(dependencies).where(eq(dependencies.projectId, project.id)),
    db.select().from(holidays).where(eq(holidays.projectId, project.id)),
  ]);
  const resourceIds = new Map(resourceRows.map((resource) => [resource.id, resource.externalId]));
  const sectionIds = new Map(sectionRows.map((section) => [section.id, section.externalId]));
  const activityIds = new Map(activityRows.map((activity) => [activity.id, activity.externalId]));
  const milestoneIds = new Map(milestoneRows.map((milestone) => [milestone.id, milestone.externalId]));
  const activityAssignments = await db.select().from(assignments);
  const capacityRows = await db.select().from(resourceCapacity);
  return validatePlanward({
    format: "planward", version: 1, exportedAt: new Date().toISOString(),
    meta: { project: { id: project.externalId, name: project.name, hoursPerDay: asNumber(settings.hoursPerDay), startDate: settings.startDate, weekDays: settings.weekDays, autoThreshold: asNumber(settings.autoThreshold), country: settings.country } },
    sections: Object.fromEntries(sectionRows.map((section) => [section.externalId, { id: section.externalId, name: section.name, code: section.code, owner: section.ownerId ? resourceIds.get(section.ownerId) ?? "" : "", order: section.order, priority: section.priority, kind: section.kind as "activities" | "milestones", ref: section.ref ?? undefined }])),
    resources: Object.fromEntries(resourceRows.map((resource) => [resource.externalId, { id: resource.externalId, name: resource.name, team: resource.team, initials: resource.initials, color: resource.color, order: resource.order, defaultCap: asNumber(resource.defaultCap), cap: Object.fromEntries(capacityRows.filter((capacity) => capacity.resourceId === resource.id).map((capacity) => [capacity.monday, asNumber(capacity.hours)])) }])),
    activities: Object.fromEntries(activityRows.map((activity) => [activity.externalId, { id: activity.externalId, name: activity.name, code: activity.code, section: sectionIds.get(activity.sectionId) ?? "", wbs: activity.wbs, status: activity.status as PlanwardDocument["activities"][string]["status"], owner: activity.ownerId ? resourceIds.get(activity.ownerId) ?? "" : "", start: activity.startDate, end: activity.endDate, dur: activity.durationDays, estimate: asNumber(activity.estimateHours), desc: activity.description, assign: Object.fromEntries(activityAssignments.filter((assignment) => assignment.activityId === activity.id).map((assignment) => [resourceIds.get(assignment.resourceId) ?? "", { planned: asNumber(assignment.plannedHours), actual: asNumber(assignment.actualHours), remaining: asNumber(assignment.remainingHours) }])), ref: activity.ref ?? undefined }])),
    milestones: Object.fromEntries(milestoneRows.map((milestone) => [milestone.externalId, { id: milestone.externalId, name: milestone.name, date: milestone.date, owner: milestone.ownerId ? resourceIds.get(milestone.ownerId) ?? "" : "", section: sectionIds.get(milestone.sectionId) ?? "", status: milestone.status as PlanwardDocument["milestones"][string]["status"], desc: milestone.description, ref: milestone.ref ?? undefined }])),
    deps: Object.fromEntries(dependencyRows.map((dependency) => [dependency.externalId, { id: dependency.externalId, from: activityIds.get(dependency.fromId) ?? milestoneIds.get(dependency.fromId) ?? "", to: activityIds.get(dependency.toId) ?? milestoneIds.get(dependency.toId) ?? "", lag: dependency.lagDays }])),
    holidays: Object.fromEntries(holidayRows.map((holiday) => [holiday.externalId, { id: holiday.externalId, name: holiday.name, start: holiday.startDate, end: holiday.endDate, who: holiday.resourceId ? resourceIds.get(holiday.resourceId) ?? "" : "" }])),
  });
}

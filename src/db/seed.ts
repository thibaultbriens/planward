// SPDX-License-Identifier: AGPL-3.0-or-later
import { randomUUID } from "node:crypto";
import echoGloves from "../../examples/echogloves.json";
import { importProjectDocument } from "../core/format";
import { getDatabase } from "./client";
import { activities, assignments, dependencies, holidays, milestones, projects, projectSettings, resourceCapacity, resources, sections } from "./schema";

const document = importProjectDocument(echoGloves);

async function seed() {
  const db = getDatabase();
  const existing = await db.select({ id: projects.id }).from(projects).limit(1);
  if (existing.length > 0) {
    console.log("Database already contains a project; seed skipped.");
    return;
  }
  if (process.env.SEED_EMPTY === "true") {
    console.log("Empty seed selected; no example project inserted.");
    return;
  }
  const projectId = randomUUID();
  const resourceIds = Object.fromEntries(Object.keys(document.resources).map((sourceId) => [sourceId, randomUUID()]));
  const sectionIds = Object.fromEntries(Object.keys(document.sections).map((sourceId) => [sourceId, randomUUID()]));
  const activityIds = Object.fromEntries(Object.keys(document.activities).map((sourceId) => [sourceId, randomUUID()]));
  const milestoneIds = Object.fromEntries(Object.keys(document.milestones).map((sourceId) => [sourceId, randomUUID()]));
  await db.transaction(async (tx) => {
    await tx.insert(projects).values({ id: projectId, name: document.meta.project.name });
    await tx.insert(projectSettings).values({ projectId, hoursPerDay: String(document.meta.project.hoursPerDay), startDate: document.meta.project.startDate, weekDays: document.meta.project.weekDays, autoThreshold: String(document.meta.project.autoThreshold), country: document.meta.project.country ?? "FR" });
    await tx.insert(resources).values(Object.entries(document.resources).map(([sourceId, resource]) => ({ id: resourceIds[sourceId], projectId, name: resource.name, team: resource.team, initials: resource.initials, color: resource.color, order: resource.order, defaultCap: String(resource.defaultCap) })));
    const capacityRows = Object.entries(document.resources).flatMap(([sourceId, resource]) => Object.entries(resource.cap).map(([monday, hours]) => ({ resourceId: resourceIds[sourceId], monday, hours: String(hours) })));
    if (capacityRows.length > 0) await tx.insert(resourceCapacity).values(capacityRows);
    await tx.insert(sections).values(Object.entries(document.sections).map(([sourceId, section]) => ({ id: sectionIds[sourceId], projectId, name: section.name, code: section.code, ownerId: section.owner ? resourceIds[section.owner] : null, order: Math.round(section.order), priority: section.priority, kind: section.kind, ref: section.ref ?? null })));
    await tx.insert(activities).values(Object.entries(document.activities).map(([sourceId, activity]) => ({ id: activityIds[sourceId], projectId, sectionId: sectionIds[activity.section], name: activity.name, code: activity.code, wbs: activity.wbs, status: activity.status, ownerId: resourceIds[activity.owner] ?? null, startDate: activity.start, endDate: activity.end, durationDays: activity.dur, estimateHours: String(activity.estimate), description: activity.desc, ref: activity.ref ?? null })));
    const assignmentRows = Object.entries(document.activities).flatMap(([sourceId, activity]) => Object.entries(activity.assign).map(([resourceId, assignment]) => ({ activityId: activityIds[sourceId], resourceId: resourceIds[resourceId], plannedHours: String(assignment.planned), actualHours: String(assignment.actual), remainingHours: String(assignment.remaining) })));
    if (assignmentRows.length > 0) await tx.insert(assignments).values(assignmentRows);
    await tx.insert(milestones).values(Object.entries(document.milestones).map(([sourceId, milestone]) => ({ id: milestoneIds[sourceId], projectId, sectionId: sectionIds[milestone.section], name: milestone.name, date: milestone.date, ownerId: resourceIds[milestone.owner] ?? null, status: milestone.status, description: milestone.desc, ref: milestone.ref ?? null })));
    await tx.insert(dependencies).values(Object.entries(document.deps).map(([, dependency]) => ({ id: randomUUID(), projectId, fromId: activityIds[dependency.from] ?? milestoneIds[dependency.from], toId: activityIds[dependency.to] ?? milestoneIds[dependency.to], lagDays: dependency.lag })));
    await tx.insert(holidays).values(Object.entries(document.holidays).map(([, holiday]) => ({ id: randomUUID(), projectId, name: holiday.name, startDate: holiday.start, endDate: holiday.end, resourceId: holiday.who ? resourceIds[holiday.who] : null })));
  });
  console.log(`Seeded ${document.meta.project.name}.`);
}

seed().catch((error: unknown) => { console.error(error); process.exitCode = 1; });

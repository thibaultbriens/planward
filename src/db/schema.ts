// SPDX-License-Identifier: AGPL-3.0-or-later
import { integer, jsonb, numeric, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

const id = () => uuid("id").defaultRandom().primaryKey();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const projects = pgTable("projects", {
  id: id(), externalId: text("external_id").notNull().default("project"), name: text("name").notNull(), createdAt: createdAt(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projectSettings = pgTable("project_settings", {
  projectId: uuid("project_id").primaryKey().references(() => projects.id, { onDelete: "cascade" }),
  hoursPerDay: numeric("hours_per_day", { precision: 8, scale: 2 }).notNull(), startDate: text("start_date").notNull(),
  weekDays: jsonb("week_days").$type<number[]>().notNull(), autoThreshold: numeric("auto_threshold", { precision: 8, scale: 2 }).notNull(), country: text("country").notNull().default("FR"),
});

export const sections = pgTable("sections", {
  id: id(), externalId: text("external_id").notNull(), projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(), code: text("code").notNull().default(""), ownerId: uuid("owner_id"), order: integer("order").notNull(), priority: integer("priority").notNull(), kind: text("kind").notNull(), ref: text("ref"),
});

export const resources = pgTable("resources", {
  id: id(), externalId: text("external_id").notNull(), projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(), team: text("team").notNull().default(""), initials: text("initials").notNull(), color: text("color").notNull(), order: integer("order").notNull(), defaultCap: numeric("default_cap", { precision: 8, scale: 2 }).notNull(),
});

export const resourceCapacity = pgTable("resource_capacity", {
  resourceId: uuid("resource_id").notNull().references(() => resources.id, { onDelete: "cascade" }),
  monday: text("monday").notNull(), hours: numeric("hours", { precision: 8, scale: 2 }).notNull(),
}, (table) => [primaryKey({ columns: [table.resourceId, table.monday] })]);

export const activities = pgTable("activities", {
  id: id(), externalId: text("external_id").notNull(), projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }), sectionId: uuid("section_id").notNull().references(() => sections.id),
  name: text("name").notNull(), code: text("code").notNull().default(""), wbs: text("wbs").notNull(), status: text("status").notNull(), ownerId: uuid("owner_id").references(() => resources.id),
  startDate: text("start_date").notNull(), endDate: text("end_date").notNull(), durationDays: integer("duration_days").notNull(), estimateHours: numeric("estimate_hours", { precision: 10, scale: 2 }).notNull(), description: text("description").notNull().default(""), ref: text("ref"),
});

export const assignments = pgTable("assignments", {
  activityId: uuid("activity_id").notNull().references(() => activities.id, { onDelete: "cascade" }), resourceId: uuid("resource_id").notNull().references(() => resources.id),
  plannedHours: numeric("planned_hours", { precision: 10, scale: 2 }).notNull(), actualHours: numeric("actual_hours", { precision: 10, scale: 2 }).notNull(), remainingHours: numeric("remaining_hours", { precision: 10, scale: 2 }).notNull(),
}, (table) => [primaryKey({ columns: [table.activityId, table.resourceId] })]);

export const milestones = pgTable("milestones", {
  id: id(), externalId: text("external_id").notNull(), projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }), sectionId: uuid("section_id").notNull().references(() => sections.id),
  name: text("name").notNull(), date: text("date").notNull(), ownerId: uuid("owner_id").references(() => resources.id), status: text("status").notNull(), description: text("description").notNull().default(""), ref: text("ref"),
});

export const dependencies = pgTable("dependencies", {
  id: id(), externalId: text("external_id").notNull(), projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }), fromId: uuid("from_id").notNull(), toId: uuid("to_id").notNull(), lagDays: integer("lag_days").notNull().default(0),
});

export const holidays = pgTable("holidays", {
  id: id(), externalId: text("external_id").notNull(), projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(), startDate: text("start_date").notNull(), endDate: text("end_date").notNull(), resourceId: uuid("resource_id").references(() => resources.id),
});

export const auditLog = pgTable("audit_log", {
  id: id(), projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }), author: text("author").notNull().default("admin"), action: text("action").notNull(), entityType: text("entity_type").notNull(), entityId: uuid("entity_id"), before: jsonb("before"), after: jsonb("after"), createdAt: createdAt(),
});

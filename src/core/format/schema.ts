// SPDX-License-Identifier: AGPL-3.0-or-later
import { z } from "zod";

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected an ISO date (YYYY-MM-DD)");
export const statusSchema = z.enum(["recorded", "qualified", "inprogress", "done", "cancelled"]);
export const identifierSchema = z.string().min(1);

const assignmentSchema = z.object({
  planned: z.number().finite().min(0),
  actual: z.number().finite().min(0),
  remaining: z.number().finite().min(0),
});

export const planwardSchema = z.object({
  format: z.literal("planward"),
  version: z.literal(1),
  exportedAt: z.string().datetime(),
  meta: z.object({
    project: z.object({
      id: identifierSchema,
      name: z.string().min(1),
      hoursPerDay: z.number().finite().positive(),
      startDate: dateSchema,
      weekDays: z.array(z.number().int().min(0).max(6)).min(1),
      autoThreshold: z.number().finite().positive(),
      country: z.string().min(2).max(2).optional(),
    }),
  }),
  sections: z.record(
    identifierSchema,
    z.object({
      id: identifierSchema,
      name: z.string().min(1),
      code: z.string(),
      owner: z.string(),
      order: z.number().finite(),
      priority: z.number().int().positive(),
      kind: z.enum(["activities", "milestones"]),
      ref: z.string().optional(),
    }),
  ),
  resources: z.record(
    identifierSchema,
    z.object({
      id: identifierSchema,
      name: z.string().min(1),
      team: z.string(),
      initials: z.string().min(1).max(4),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Expected a hexadecimal colour"),
      order: z.number().int().nonnegative(),
      defaultCap: z.number().finite().nonnegative(),
      cap: z.record(dateSchema, z.number().finite().nonnegative()),
    }),
  ),
  activities: z.record(
    identifierSchema,
    z.object({
      id: identifierSchema,
      name: z.string().min(1),
      code: z.string(),
      section: identifierSchema,
      wbs: z.string(),
      status: statusSchema,
      owner: z.string(),
      start: dateSchema,
      end: dateSchema,
      dur: z.number().int().positive(),
      estimate: z.number().finite().nonnegative(),
      desc: z.string(),
      assign: z.record(identifierSchema, assignmentSchema),
      ref: z.string().optional(),
    }),
  ),
  milestones: z.record(
    identifierSchema,
    z.object({
      id: identifierSchema,
      name: z.string().min(1),
      date: dateSchema,
      owner: z.string(),
      section: identifierSchema,
      status: statusSchema,
      desc: z.string().default(""),
      ref: z.string().optional(),
    }),
  ),
  deps: z.record(
    identifierSchema,
    z.object({
      id: identifierSchema,
      from: identifierSchema,
      to: identifierSchema,
      lag: z.number().int(),
    }),
  ),
  holidays: z.record(
    identifierSchema,
    z.object({
      id: identifierSchema,
      name: z.string().min(1),
      start: dateSchema,
      end: dateSchema,
      who: z.string(),
    }),
  ),
});

export type PlanwardDocument = z.infer<typeof planwardSchema>;
export type Activity = PlanwardDocument["activities"][string];
export type Milestone = PlanwardDocument["milestones"][string];
export type Dependency = PlanwardDocument["deps"][string];

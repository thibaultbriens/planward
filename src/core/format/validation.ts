// SPDX-License-Identifier: AGPL-3.0-or-later
import { ZodError } from "zod";
import { planwardSchema, type PlanwardDocument } from "./schema";

export class ProjectFormatError extends Error {
  constructor(public readonly problems: string[]) {
    super(problems.join("\n"));
    this.name = "ProjectFormatError";
  }
}

function describeZodError(error: ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length === 0 ? "document" : issue.path.join(".");
    return `${path}: ${issue.message}`;
  });
}

function findCycle(document: PlanwardDocument): string[] | null {
  const successors = new Map<string, string[]>();
  for (const dependency of Object.values(document.deps)) {
    const values = successors.get(dependency.from) ?? [];
    values.push(dependency.to);
    successors.set(dependency.from, values);
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (node: string, path: string[]): string[] | null => {
    if (visiting.has(node)) return [...path, node];
    if (visited.has(node)) return null;
    visiting.add(node);
    for (const successor of successors.get(node) ?? []) {
      const cycle = visit(successor, [...path, node]);
      if (cycle) return cycle;
    }
    visiting.delete(node);
    visited.add(node);
    return null;
  };
  for (const node of [...Object.keys(document.activities), ...Object.keys(document.milestones)]) {
    const cycle = visit(node, []);
    if (cycle) return cycle;
  }
  return null;
}

export function validatePlanward(input: unknown): PlanwardDocument {
  const parsed = planwardSchema.safeParse(input);
  if (!parsed.success) throw new ProjectFormatError(describeZodError(parsed.error));
  const document = parsed.data;
  const problems: string[] = [];
  const nodes = new Set([...Object.keys(document.activities), ...Object.keys(document.milestones)]);
  for (const [id, section] of Object.entries(document.sections)) {
    if (section.id !== id) problems.push(`sections.${id}.id: key and id must match`);
    if (section.owner && !document.resources[section.owner]) {
      problems.push(`sections.${id}.owner: unknown resource “${section.owner}”`);
    }
  }
  for (const [id, resource] of Object.entries(document.resources)) {
    if (resource.id !== id) problems.push(`resources.${id}.id: key and id must match`);
  }
  for (const [id, activity] of Object.entries(document.activities)) {
    if (activity.id !== id) problems.push(`activities.${id}.id: key and id must match`);
    if (!document.sections[activity.section]) problems.push(`activities.${id}.section: unknown section “${activity.section}”`);
    if (!document.resources[activity.owner]) problems.push(`activities.${id}.owner: unknown resource “${activity.owner}”`);
    if (activity.end < activity.start) problems.push(`activities.${id}: end must not precede start`);
    for (const resourceId of Object.keys(activity.assign)) {
      if (!document.resources[resourceId]) problems.push(`activities.${id}.assign.${resourceId}: unknown resource`);
    }
  }
  for (const [id, milestone] of Object.entries(document.milestones)) {
    if (milestone.id !== id) problems.push(`milestones.${id}.id: key and id must match`);
    if (!document.sections[milestone.section]) problems.push(`milestones.${id}.section: unknown section “${milestone.section}”`);
    if (!document.resources[milestone.owner]) problems.push(`milestones.${id}.owner: unknown resource “${milestone.owner}”`);
  }
  for (const [id, holiday] of Object.entries(document.holidays)) {
    if (holiday.id !== id) problems.push(`holidays.${id}.id: key and id must match`);
    if (holiday.end < holiday.start) problems.push(`holidays.${id}: end must not precede start`);
    if (holiday.who && !document.resources[holiday.who]) problems.push(`holidays.${id}.who: unknown resource “${holiday.who}”`);
  }
  for (const [id, dependency] of Object.entries(document.deps)) {
    if (dependency.id !== id) problems.push(`deps.${id}.id: key and id must match`);
    if (!nodes.has(dependency.from)) problems.push(`deps.${id}.from: unknown activity or milestone “${dependency.from}”`);
    if (!nodes.has(dependency.to)) problems.push(`deps.${id}.to: unknown activity or milestone “${dependency.to}”`);
  }
  const cycle = findCycle(document);
  if (cycle) problems.push(`deps: cycle detected (${cycle.join(" → ")})`);
  if (problems.length > 0) throw new ProjectFormatError(problems);
  return document;
}

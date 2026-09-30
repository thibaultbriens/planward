// SPDX-License-Identifier: AGPL-3.0-or-later
import { hasEditorSession } from "./session";

export type Viewer = { canEdit: boolean };

export async function getViewer(): Promise<Viewer> {
  const canEdit = await hasEditorSession();
  if (process.env.PRIVATE === "true" && !canEdit) throw new Error("Authentication is required to view this project.");
  return { canEdit };
}

export async function requireEditor(): Promise<void> {
  if (!(await hasEditorSession())) throw new Error("Editor authentication is required.");
}

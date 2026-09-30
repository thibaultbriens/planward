// SPDX-License-Identifier: AGPL-3.0-or-later
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { importProjectDocument, ProjectFormatError } from "@/core/format";
import { getViewer, requireEditor } from "@/server/access";
import { getCurrentProject } from "@/server/project-repository";
import { replaceCurrentProject, updateActivity } from "@/server/project-writer";

const activityUpdateSchema = z.object({
  kind: z.literal("activity"),
  id: z.string().min(1),
  patch: z.object({
    name: z.string().min(1),
    status: z.enum(["recorded", "qualified", "inprogress", "done", "cancelled"]),
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dur: z.number().int().positive(),
    estimate: z.number().nonnegative(),
    desc: z.string(),
  }),
});

export async function GET() {
  await getViewer();
  const project = await getCurrentProject();
  return NextResponse.json(project);
}

export async function PUT(request: NextRequest) {
  try {
    await requireEditor();
    const body = await request.json();
    if (!body.confirm)
      return NextResponse.json(
        { error: "La confirmation explicite est requise." },
        { status: 400 },
      );
    const project = importProjectDocument(body.document);
    await replaceCurrentProject(project);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ProjectFormatError)
      return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof Error && error.message.includes("Editor authentication"))
      return NextResponse.json(
        { error: "Authentification administrateur requise." },
        { status: 401 },
      );
    console.error("Project import failed", error);
    return NextResponse.json({ error: "Import impossible." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireEditor();
    const parsed = activityUpdateSchema.safeParse(await request.json());
    if (!parsed.success)
      return NextResponse.json({ error: "Modification invalide." }, { status: 400 });
    await updateActivity(parsed.data.id, parsed.data.patch);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ProjectFormatError)
      return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof Error && error.message.includes("Editor authentication"))
      return NextResponse.json(
        { error: "Authentification administrateur requise." },
        { status: 401 },
      );
    console.error("Project update failed", error);
    return NextResponse.json({ error: "Modification impossible." }, { status: 500 });
  }
}

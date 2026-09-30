// SPDX-License-Identifier: AGPL-3.0-or-later
import { NextRequest, NextResponse } from "next/server";
import { importProjectDocument, ProjectFormatError } from "@/core/format";
import { getViewer, requireEditor } from "@/server/access";
import { getCurrentProject } from "@/server/project-repository";
import { replaceCurrentProject } from "@/server/project-writer";

export async function GET() {
  await getViewer();
  const project = await getCurrentProject();
  return NextResponse.json(project);
}

export async function PUT(request: NextRequest) {
  try {
    await requireEditor();
    const body = await request.json();
    if (!body.confirm) return NextResponse.json({ error: "La confirmation explicite est requise." }, { status: 400 });
    const project = importProjectDocument(body.document);
    await replaceCurrentProject(project);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ProjectFormatError) return NextResponse.json({ error: error.message }, { status: 400 });
    if (error instanceof Error && error.message.includes("Editor authentication")) return NextResponse.json({ error: "Authentification administrateur requise." }, { status: 401 });
    console.error("Project import failed", error);
    return NextResponse.json({ error: "Import impossible." }, { status: 500 });
  }
}

// SPDX-License-Identifier: AGPL-3.0-or-later
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertLoginAllowed, clearLoginAttempts, recordFailedLogin, verifyAdminPassword } from "@/server/auth";
import { createEditorSession, destroyEditorSession } from "@/server/session";

const credentialsSchema = z.object({ password: z.string().min(1).max(1024) });

function requestIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function POST(request: NextRequest) {
  const ip = requestIp(request);
  try {
    assertLoginAllowed(ip);
    const credentials = credentialsSchema.safeParse(await request.json());
    if (!credentials.success || !(await verifyAdminPassword(credentials.data.password))) {
      recordFailedLogin(ip);
      return NextResponse.json({ error: "Identifiants invalides." }, { status: 401 });
    }
    clearLoginAttempts(ip);
    await createEditorSession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Too many")) return NextResponse.json({ error: "Trop de tentatives. Réessaie plus tard." }, { status: 429 });
    console.error("Session creation failed", error);
    return NextResponse.json({ error: "Identifiants invalides." }, { status: 401 });
  }
}

export async function DELETE() {
  await destroyEditorSession();
  return new NextResponse(null, { status: 204 });
}

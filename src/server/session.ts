// SPDX-License-Identifier: AGPL-3.0-or-later
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "planward_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
type Payload = { role: "editor"; exp: number };

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET must be configured.");
  return value;
}

function encode(payload: Payload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function decode(value: string, now = Date.now()): Payload | null {
  const [body, signature] = value.split(".");
  if (!body || !signature) return null;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const given = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Payload;
    return payload.role === "editor" && Number.isFinite(payload.exp) && payload.exp > now ? payload : null;
  } catch {
    return null;
  }
}

export async function hasEditorSession(): Promise<boolean> {
  const value = (await cookies()).get(COOKIE_NAME)?.value;
  return value ? decode(value) !== null : false;
}

export async function createEditorSession(): Promise<void> {
  const expires = new Date(Date.now() + MAX_AGE_SECONDS * 1000);
  (await cookies()).set(COOKIE_NAME, encode({ role: "editor", exp: expires.getTime() }), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires,
  });
}

export async function destroyEditorSession(): Promise<void> {
  (await cookies()).set(COOKIE_NAME, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}

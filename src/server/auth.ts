// SPDX-License-Identifier: AGPL-3.0-or-later
import { compare } from "bcryptjs";
import { timingSafeEqual } from "node:crypto";

const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;

function configuredPassword(): { hash?: string; plain?: string } {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  const plain = process.env.ADMIN_PASSWORD;
  if (!hash && !plain) throw new Error("ADMIN_PASSWORD_HASH or ADMIN_PASSWORD must be configured.");
  return { hash, plain };
}

export function assertAuthenticationConfigured(): void {
  configuredPassword();
  if (!process.env.SESSION_SECRET) throw new Error("SESSION_SECRET must be configured.");
}

export function assertLoginAllowed(ip: string, now = Date.now()): void {
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt <= now) return;
  if (entry.count >= MAX_ATTEMPTS) throw new Error("Too many login attempts. Try again later.");
}

export function recordFailedLogin(ip: string, now = Date.now()): void {
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt <= now) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  attempts.set(ip, { ...entry, count: entry.count + 1 });
}

export function clearLoginAttempts(ip: string): void {
  attempts.delete(ip);
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const { hash, plain } = configuredPassword();
  if (hash) return compare(password, hash);
  const supplied = Buffer.from(password);
  const expected = Buffer.from(plain ?? "");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

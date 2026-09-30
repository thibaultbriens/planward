// SPDX-License-Identifier: AGPL-3.0-or-later
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { assertAuthenticationConfigured } = await import("./server/auth");
  assertAuthenticationConfigured();
}

// SPDX-License-Identifier: AGPL-3.0-or-later
import { hash } from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error("Usage: pnpm admin:hash <password>");
  process.exitCode = 1;
} else {
  console.log(await hash(password, 12));
}

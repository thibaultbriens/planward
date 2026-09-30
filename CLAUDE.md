# Planward contributor guide

## Commands

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Invariants

- `src/core` contains pure domain logic only: no React, Next.js, database, DOM, or global clock.
- Working-day duration is authoritative; dates are derived from it on calendar changes.
- Dependency cascade only propagates forward; milestones never move automatically.
- No example-project data belongs in application source.
- UI strings live in translation files, not components.
- `src/core/format/schema.ts` is the public JSON contract. Do not alter it without a version bump and migration.
- Every `src/core` change includes tests.

## Conventions

- Use TypeScript strict mode and SPDX headers on source files.
- Never write directly to the database from a component.
- Do not edit applied migrations; add a new migration instead.
- Do not add a dependency without a stated need.
- Do not visually redesign the UI: `legacy/pilotage.html` is authoritative.
- Use atomic commits with `Signed-off-by` trailers.

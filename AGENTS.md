# Planward agent contract

## graphify

- **graphify** (`~/.Codex/skills/graphify/SKILL.md`) — any input to knowledge graph. Trigger: `/graphify`.
  When the user types `/graphify`, invoke the Skill tool with `skill: "graphify"` before doing anything else.

## Scope and safety

- Preserve the public, versioned Planward JSON contract in `src/core/format/schema.ts`.
- Preserve visual fidelity to `legacy/pilotage.html`; do not rename UI labels or redesign components.
- Never hard-code secrets or put real data in tests.
- Never make destructive database migrations without a backup path.
- Ask rather than guess when a choice changes the JSON contract, data model, licence, or appearance.

## Required verification

Before reporting implementation work complete, run:

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Report changed files, verification results, known gaps, and any deviations explicitly.

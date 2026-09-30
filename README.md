# Planward

[![CI](https://github.com/thibaultbriens/planward/actions/workflows/ci.yml/badge.svg)](https://github.com/thibaultbriens/planward/actions/workflows/ci.yml)
[![License: AGPL-3.0-or-later](https://img.shields.io/badge/license-AGPL--3.0--or--later-blue.svg)](LICENSE)

Lightweight open-source project planning with real capacity limits: Gantt timeline, dependencies, workload per person, and automatic scheduling. Self-hostable, free.

Planward is a planning tool for small teams. It combines a project list, a Gantt-style
timeline, per-person weekly capacity, dependencies, and capacity-aware scheduling. The
interface is French today; project data and documentation are generic.

## Status

This is an active, faithful port of the EchoGloves standalone prototype. The project list,
timeline, capacity matrix, public read access, administrator session, JSON import/export,
XLSX export, PDF export, and scheduling simulation are available.

[`legacy/pilotage.html`](legacy/pilotage.html) remains untouched as the visual and
behavioural reference while remaining editing interactions are ported.

## Why this exists

Planward was born from the EchoGloves student project: a team of six needed to coordinate a
sign-language translation glove over one semester. Conventional planning tools were too
heavy, while task tools did not model hours, capacity, and dependency cascades well enough.
Planward focuses on that missing middle ground without a paid plan or hosted-service
requirement.

## Features

- Public read-only planning and a password-protected administrator session.
- Activities, milestones, sections, resources, assignments, dependencies, and holidays in
  one versioned JSON document.
- Tested business-day calendar, capacity calculations, dependency checks, and optimizer.
- List, Timeline, and Capacity views backed by PostgreSQL.
- JSON, XLSX, and A3-landscape PDF export.
- Docker Compose deployment for PostgreSQL and the standalone Next.js runtime.

## Non-goals

Planward intentionally does not provide portfolio management, invoicing, ticket time
tracking, configurable workflows, fine-grained permissions, or an integration marketplace.

## Quick start

Requirements: Node.js 22+, pnpm, and PostgreSQL 16+.

```sh
pnpm install
cp .env.example .env
```

Set these local-development values in `.env`:

```dotenv
DATABASE_URL=postgres://planward:planward@localhost:5432/planward
ADMIN_PASSWORD=choose-a-local-password
SESSION_SECRET=replace-with-a-long-random-secret
```

Create the schema, load the example project, then start the server:

```sh
pnpm db:push
pnpm db:seed
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The example starts in read-only mode;
choose **Connexion** and enter `ADMIN_PASSWORD` to open an administrator session. In
production, use `ADMIN_PASSWORD_HASH` instead (`pnpm admin:hash`). Set `PRIVATE=true` when
viewing should require that session too.

## Data and imports

Planward exchanges a complete project through a versioned JSON document. The public contract
is [`src/core/format/schema.ts`](src/core/format/schema.ts): it must not change without a
version bump and migration. The importer accepts `planward` and historic `echo-pm` v1 JSON.

An administrator can import JSON after explicit confirmation. The operation replaces the
current project transactionally and records an audit entry. JSON export is round-trippable;
XLSX and PDF are communication exports, not import formats.

## Access model

There are no user accounts in this release. Anyone with the URL can view and export. A
single administrator password grants a signed, HTTP-only, 30-day editing session. Every
write route checks that session server-side. The audit log identifies changes as `admin`,
not as an individual person.

## Scheduling model

1. Weekends and project-wide holidays are non-working days; activity duration is stored in
   working days.
2. Moving an activity can cascade forward to successors; milestones stay fixed and can be
   violated.
3. Assigned work is spread over working days and aggregated by ISO week.
4. Resource availability is weekly and is reduced for absences unless overridden manually.
5. The optimizer orders work by section priority, dependency depth, and earliest possible
   date while observing a capacity threshold where possible.
6. Simulations produce a draft before a future apply action changes stored dates.

## Architecture

```text
src/core/       Pure calendar, schedule, capacity, optimizer, and JSON-format domain
src/db/         Drizzle schema, migrations, and example seed
src/server/     Session/access boundary and persisted-project services
src/app/        Next.js pages and route handlers
src/components/ User interface
src/export/     Browser-side JSON, XLSX, and PDF export services
tests/e2e/      Playwright browser journeys
legacy/         Preserved standalone specification and source fixture
```

## Testing

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Browser tests need PostgreSQL configured as in `playwright.config.ts`; Docker Compose can
provide it locally.

## Deploy

For a VPS, configure `.env` then run Docker Compose. For Vercel, connect the repository and
supply `DATABASE_URL`, `ADMIN_PASSWORD_HASH`, and `SESSION_SECRET`. See
[docs/self-hosting.md](docs/self-hosting.md) for operational notes.

## Roadmap

- Persisted editing for activities, sections, milestones, assignments, capacity, and holidays.
- Timeline drag, resize, dependency arrows, and capacity overlay faithful to the prototype.
- Optimizer preview diff and administrator-only apply action.
- Browser coverage for editing cascades and optimizer application.
- Screenshots and a visual review against the standalone reference.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md). Scheduling logic belongs in `src/core` with tests;
the JSON contract is public and versioned; UI changes must retain the standalone reference’s
labels, density, and visual language.

## License and support

Planward is AGPL-3.0-or-later with the attribution condition in [NOTICE](NOTICE). Keep the
**Powered by Planward** footer and repository link in modified versions. If this is useful,
star the repository, share feedback in Discussions, or support the project with a donation.

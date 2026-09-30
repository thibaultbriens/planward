# Planward

[![CI](https://github.com/planward/planward/actions/workflows/ci.yml/badge.svg)](https://github.com/planward/planward/actions/workflows/ci.yml)
[![License: AGPL-3.0-or-later](https://img.shields.io/badge/license-AGPL--3.0--or--later-blue.svg)](LICENSE)

Lightweight open-source project planning with real capacity limits: Gantt timeline, dependencies, workload per person, and automatic scheduling. Self-hostable, free.

Planward is being ported faithfully from the EchoGloves prototype. The legacy standalone
application remains in [`legacy/pilotage.html`](legacy/pilotage.html) as the visual and
behavioural reference during the port.

## Quick start

```sh
pnpm install
cp .env.example .env
pnpm db:push
pnpm db:seed
pnpm dev
```

The planning is public by default. Enter the administrator password in the application to
edit; set `PRIVATE=true` when read access should require the same session.

## Deploy

Use a managed PostgreSQL database on Vercel, or run the included Docker Compose stack on a
small VPS. See [self-hosting](docs/self-hosting.md).

## Non-goals

Planward deliberately does not provide portfolio management, invoicing, ticket time
tracking, configurable workflows, fine-grained permissions, or a marketplace of
integrations.

## License

AGPL-3.0-or-later. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

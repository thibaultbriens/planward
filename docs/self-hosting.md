# Self-hosting Planward

Planward runs on a single PostgreSQL database. Set `DATABASE_URL`,
`ADMIN_PASSWORD_HASH`, and a long random `SESSION_SECRET` before starting it.

## Docker Compose

Copy `.env.example` to `.env`, fill the required values, then run:

```sh
docker compose up -d --build
```

Run `pnpm db:migrate` before the first application start, from a checkout that has the
same `DATABASE_URL`; run `pnpm db:seed` only to initialise a new instance. The standalone
runtime image intentionally contains no package manager or development tooling.

Put a TLS reverse proxy in front of port 3000. Keep the database volume: it contains the
project and audit history. Changing `SESSION_SECRET` revokes every editor session.

## Vercel

Connect the repository and supply the same three variables plus a managed PostgreSQL
`DATABASE_URL`. Run the Drizzle migration as part of your release process, then seed only
when creating a new empty instance.

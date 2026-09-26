# Atlas

Atlas is a discovery and planning application. This repository is the production foundation: one NestJS API, an Expo client, and a separate admin shell. It does not contain the older NYTO application.

## What runs locally

| Process | Purpose |
| --- | --- |
| PostgreSQL 16 + PostGIS | Canonical data, search documents, geography |
| Redis | Readiness check and the cache/rate-limit boundary |
| `@atlas/api` | Versioned HTTP API at `/api/v1` |
| `@atlas/mobile` | Consumer client |
| `@atlas/admin` | Operations console at `/admin` |

Home and catalog search read the owned catalog. The provider gateway is a separate path. The fixture adapter is development-only. Google Places is registered only when `GOOGLE_PLACES_API_KEY` is set, and Google content is not written to Postgres.

## Requirements

- Node.js 22 or newer
- pnpm 10.15.1, invoked as `corepack pnpm` if pnpm is not on PATH
- Docker, when you want Postgres and Redis

## First run

```powershell
copy .env.example .env
corepack pnpm install
corepack pnpm --filter @atlas/config build
corepack pnpm --filter @atlas/contracts build
docker compose -f infra/docker-compose.yml up -d
corepack pnpm migrate
corepack pnpm seed
corepack pnpm dev:api
```

In other terminals:

```powershell
corepack pnpm dev:admin
corepack pnpm dev:mobile
```

The API reads `../../.env` from `apps/api` via `tsx --env-file`. Do not commit `.env`.

Admin listens on `http://localhost:5173`. The mobile dev server uses Expo. Set `EXPO_PUBLIC_API_URL` if the phone cannot reach `http://localhost:3000`. Admin uses `VITE_API_URL` the same way.

## Commands

| Command | What it does |
| --- | --- |
| `corepack pnpm typecheck` | Typechecks packages, API, and admin. Build `config` and `contracts` first. |
| `corepack pnpm --filter @atlas/mobile typecheck` | Typechecks the Expo app |
| `corepack pnpm test` | Unit, contract, and architecture tests |
| `corepack pnpm lint` | ESLint for the API and packages |
| `corepack pnpm migrate` | Applies `apps/api/migrations` |
| `corepack pnpm seed` | Loads fixture data. Refuses `NODE_ENV=production` |

## Environment

See `.env.example`. Production startup refuses `AUTH_LOG_DEV_OTP=true`, `FIXTURE_PROVIDER_ENABLED=true`, an empty `CORS_ORIGINS`, and secrets shorter than the documented minimums.

Phone sign-in stays closed until `PHONE_COUNTRY_ALLOWLIST` lists calling codes. An empty list returns `AUTH_PROVIDER_NOT_CONFIGURED`. Google and Apple sign-in verify tokens only when client IDs are configured. Those secrets stay on the server.

## Layout

```
apps/mobile     Expo client
apps/admin      Admin shell
apps/api        NestJS API and SQL migrations
packages/contracts   Shared request, response, and error types
packages/config      Limits and environment schema
infra/docker-compose.yml
docs/architecture
docs/providers
```

`NYTO_BACKEND` and `NYTO_FRONTEND` are a different product. Do not add Atlas code there.

## Further reading

- [Architecture rules](docs/architecture/README.md)
- [Provider adapters](docs/providers/README.md)
- [Decisions made while building the foundation](docs/architecture/decisions.md)

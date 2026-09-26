# Implementation decisions

These are choices made while building the foundation. They do not replace the approved architecture.

## Repository layout

The approved specification described top-level `mobile`, `backend`, and `admin-web` directories and an `/v1` prefix. The Phase 1 brief requires `apps/mobile`, `apps/admin`, `apps/api`, and `/api/v1`. The brief wins. There is still one API.

## SQL is the schema source

Migrations in `apps/api/migrations` are canonical because they include PostGIS, partial unique indexes, and the UUIDv7 function. Drizzle is connected as `Database.orm` for later query building. A second Drizzle table graph was not generated, so the SQL file cannot drift from an unused schema.

## Application ids

`newId()` uses `crypto.randomUUID()`, which is UUID version 4. Rows that omit `id` use `atlas_uuidv7()`. Prefer the database default for new rows.

## Google content

The Google adapter calls Places API (New) `searchText` and reads place id, display name, address, location, and Maps links. Those observations stay in the request. They are not inserted into `search_documents` or `external_references`. The map SDK is not in this phase. If a Google result is shown later, the map must be a Google map and the attribution text is `Google Maps`.

## Destination handles

A provider result without a stored destination row gets a short-lived HMAC handle. The client sends that id back to `POST /api/v1/destinations/resolve`. The server rebuilds the URL and checks the host allowlist. Clients never receive a raw provider URL to open on their own.

## Selected city on device

The selected discovery city is held in Zustand for the session. Secure Store holds the access token. A second native storage module was not added.

## Lists

Search and home lists use `FlatList`.

## Observability

Logs are JSON on stdout, with a redaction list for secrets and one-time codes. Request id and correlation id are on every response. Provider and search timings use the `timed` helper. `SENTRY_DSN` is validated and unused until an error-tracking SDK is chosen. Redis is present so readiness and later rate-limit or cache work have a real dependency. pg-boss is not started in this phase.

## Phone and email

Email registration and login are included because the approved specification made email final. Phone OTP is real hashing and expiry, and it refuses to send when the country allowlist is empty. Development can print the code only when `NODE_ENV=development` and `AUTH_LOG_DEV_OTP=true`.

## Public bearer tokens

An invalid bearer token on a public route is treated as a guest. A protected route then returns `AUTHENTICATION_REQUIRED`.

## Fixture data

`apps/api/seeds/002_fixture.sql` is development data. It is not production content. The seed command refuses production.

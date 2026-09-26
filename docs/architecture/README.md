# Architecture rules

Atlas is one NestJS process. Mobile and admin call `/api/v1`. They do not contain a second backend.

## Module boundaries

Implemented domains live under `apps/api/src/modules`:

- `identity` — users, identities, devices, sessions, refresh tokens, Google, Apple, phone, email
- `geo` — resolving a place name into a stored location
- `catalog` — owned subjects. The home query is in `editorial` and reads catalog tables only
- `editorial` — home rails from the catalog
- `providers` — gateway and adapters
- `destinations` — allowlisted URL resolution
- `search` — the retrieval pipeline
- `library` — saves, collections, recent views
- `trips` — trip, destination, civil dates, days, items

These modules exist as boundaries and do not implement product behavior yet: `consent`, `recommendations`, `reviews`, `moderation`, `weather`, `notifications`, `flags`, `audit`, `privacy`, `admin` (the admin HTTP status check lives with the other controllers).

## Dependency rules

- Catalog and home do not call provider adapters or the provider gateway.
- Search calls the provider gateway. The gateway calls adapters.
- Mobile and admin import `@atlas/contracts` only. They do not import `google-auth-library` or adapter types.
- A database transaction must not stay open across a provider HTTP call. Search runs catalog SQL and the gateway separately. Trip day creation is a database-only transaction.

`apps/api/test/foundation.test.ts` checks the home and search import boundaries, and scans the clients for provider SDK imports.

## Three locations

These are different values:

- Device location is the current GPS point. It is sent with a search request and is not stored as a history.
- Selected discovery location is the city the person is browsing.
- Trip destination is the place a trip is planned around, with that place's IANA timezone.

A person in Bengaluru can browse Paris.

## Search

The pipeline is normalize, classify, interpret, resolve location, resolve time, retrieve, deduplicate, rank, present. The rules interpreter is active. `LlmIntentInterpreter` exists and refuses to run. It is not registered. An interpreter may return constraints only. Prices, addresses, hours, availability, ratings, and URLs come from retrieval.

## Auth

Guest requests can search and open home. Saves, collections, recent views, trips, and admin status require a session. A missing session returns `AUTHENTICATION_REQUIRED`.

## Errors

Clients receive `{ data, meta, error }`. `error.code` is from `@atlas/contracts`. Production responses do not include stack traces or raw database messages. `meta.requestId` is the support reference.

## Identifiers and time

Postgres generates UUIDv7 through `atlas_uuidv7()`. Timestamps are `timestamptz`. Trip dates are civil dates. Money, when present, is minor units plus an ISO currency code. There is no currency conversion.

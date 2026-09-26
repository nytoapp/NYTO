# Provider adapters

Search calls `ProviderGateway`. The gateway calls adapters. Catalog code does not.

## What an observation contains

Each adapter returns observations with:

- `provider`
- `externalId`
- `kind`
- display fields (`title`, optional `summary`)
- `location`
- `destination` label and URL, or null
- `attribution`
- `fetchedAt`
- `expiresAt`
- `state` (`ok`, `unavailable`, `stale`, `unknown`)

The gateway normalizes failures into warnings. One adapter timing out does not fail the search when another source returned results.

## Registered adapters

| Adapter | When it runs | What it does |
| --- | --- | --- |
| `fixture` | `FIXTURE_PROVIDER_ENABLED=true` and not production | Returns the built-in fixture observations. Production environment validation refuses this flag. |
| `google` | `GOOGLE_PLACES_API_KEY` is non-empty | Calls Google Places API (New). Disabled with no key. No scraped HTML. No invented booking or delivery APIs. |

Later adapters (delivery, tickets, hotels, and others) implement the same `ProviderAdapter` interface. Do not add a provider by hard-coding its SDK types into mobile or admin.

## Gateway limits

- At most 5 adapters per search
- 800 ms per adapter
- 1200 ms deadline for the fan-out
- Concurrency cap 4
- Token bucket 20 requests per second per adapter
- Circuit opens after 5 failures for 30 seconds
- No retry on the user request path
- `AbortSignal` cancellation when the deadline or timeout fires

## Destination safety

Adapter URLs pass `assertSafeDestinationUrl` before a client can open them:

- `https` only
- host must be on that provider's allowlist
- no `javascript:`, `data:`, `file:`, or other schemes
- no userinfo
- no private or link-local addresses

If the check fails, the action is omitted.

## Google storage rule

Store a Google place id only when a later feature has a reviewed reason to do so. Do not copy Google names, addresses, hours, photos, or links into Postgres as catalog content. The 15-minute handle is a request-scoped signed id, not a warehouse of Google links.

## Tests

`apps/api/test/foundation.test.ts` covers timeout, malformed Google JSON, an open circuit, and the import boundary. Run:

```powershell
corepack pnpm --filter @atlas/api test
```

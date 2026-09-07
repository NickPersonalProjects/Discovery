# Discovery Farm Finder

Discovery is a nationwide-ready local farm finder foundation for all 50 U.S. states plus Washington, D.C. It now uses PostgreSQL/PostGIS persistence, an async repository boundary, and an Eatwild-only importer adapter behind explicit runtime safeguards.

## Architecture and data flow

- **UI (Next.js App Router)** calls server API routes for search and health checks.
- **Server repository boundary** resolves to:
  - Prisma/PostgreSQL implementation for production (`DATABASE_URL` configured), or
  - deterministic fictional seed repository only when explicitly enabled (`LOCAL_DEMO_SEED_ENABLED=true`).
- **Search pipeline** supports:
  - browser coordinates,
  - textual U.S. location queries (ZIP or city/state) via optional geocoder provider,
  - category filters,
  - published-only filtering,
  - bounded pagination,
  - PostGIS distance ordering/radius filtering when coordinates are available.
- **Importer pipeline**:
  - discovers Eatwild state pages from the directory index,
  - parses structured listing facts,
  - maps product keywords into taxonomy,
  - geocodes through an injected provider,
  - performs duplicate-candidate checks,
  - upserts source records idempotently with source attribution metadata.

## Critical Eatwild compliance warning

Eatwild is a curated paid-listing directory. This repository includes a technically complete importer adapter but **does not grant usage rights**.

You must explicitly opt in before any import run and are responsible for:

- permission/authorization,
- terms compliance,
- robots directives,
- rate limits,
- required attribution.

The importer fails safely when opt-in is absent.

## Environment variables

Copy `.env.example` to `.env.local` and configure:

- `DATABASE_URL` for PostgreSQL/PostGIS.
- `LOCAL_DEMO_SEED_ENABLED=true` only for explicit local demo fallback.
- `EATWILD_IMPORT_ENABLED=true` only for explicit authorized import runs.
- `EATWILD_IMPORT_USER_AGENT` with contact details.
- importer throttle/concurrency/retry variables.
- optional geocoder config: `GEOCODER_PROVIDER=nominatim` + `GEOCODER_USER_AGENT`.

## Local PostgreSQL/PostGIS setup (Supabase-compatible)

1. Provision PostgreSQL with PostGIS enabled (Supabase/Postgres + PostGIS extension).
2. Set `DATABASE_URL`.
3. Run migration and client generation:

```bash
npm run db:generate
npm run db:migrate
```

4. Seed deterministic demo records (idempotent):

```bash
npm run db:seed
```

## Import commands

### Dry-run for one state

```bash
npm run import:eatwild -- --state=VA --dry-run
```

### Write import for one state (explicit opt-in required)

```bash
EATWILD_IMPORT_ENABLED=true npm run import:eatwild -- --state=VA
```

### Nationwide import (stronger confirmation required)

```bash
EATWILD_IMPORT_ENABLED=true npm run import:eatwild -- --all-states --confirm-national-import
```

Importer output includes structured counts for:

- pages fetched
- listings parsed
- inserted
- updated
- skipped
- duplicate candidates
- parse warnings
- failures

## Data freshness and re-import strategy

- Re-run importer state-by-state or nationwide as needed.
- Source records are upserted idempotently by stable source IDs.
- Keep parse warnings/failures and review before publish decisions.
- Use pending/unpublished states for records that miss minimum publish criteria.

## Search and publication behavior

- Radius results are PostGIS distance queries and sorted nearest-first.
- Records without reliable coordinates are not included in radius matches.
- Textual location search returns a clear configuration message if geocoding is unavailable.
- Practice info from Eatwild is displayed as **source-provided claims**, not independent verification.

## Health/readiness behavior

- `/api/health` reports repository readiness.
- Missing DB configuration returns understandable errors instead of silently serving fictional production data.

## Deferred work (intentionally not expanded in this PR)

- public farm submissions workflow expansion,
- owner-claim/authentication flows,
- admin moderation console.

Existing submission UI/domain scaffolding remains available but unchanged in scope.

## Quality commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Operational safeguards and rollback guidance

- Keep importer runs explicit and state-scoped when possible.
- Start with `--dry-run` to validate parser/geocoder behavior.
- Use database backups/point-in-time recovery before nationwide writes.
- To roll back a bad import, restore from backup or remove affected `SourceRecord`/`Farm` rows scoped by `sourceName='Eatwild'` and import timestamps.

## Production checklist

- [ ] PostgreSQL/PostGIS provisioned and reachable from runtime.
- [ ] Prisma migration deployed.
- [ ] `DATABASE_URL` configured server-side only.
- [ ] Geocoder provider configured (or textual geocode disabled intentionally).
- [ ] Eatwild permission/compliance confirmed before enabling import.
- [ ] Import runbook documented for dry-run, state import, nationwide confirmation, and rollback.
- [ ] Monitoring/alerts configured for importer failures and DB health.

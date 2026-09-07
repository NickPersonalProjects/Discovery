# Discovery Farm Finder

Discovery is a production-oriented MVP scaffold for a responsive local farm finder. It helps visitors search for farms selling products near them without requiring an account, then browse list results, a map-ready fallback, and detailed farm profiles with transparent source attribution.

This first PR uses deterministic fictional seed data only. It is architected to become nationwide-ready with PostgreSQL/PostGIS, Supabase, MapLibre, moderation workflows, and permission-based data ingestion.

## Current MVP capabilities

- Search by seeded ZIP code or city, with radius filtering.
- Optional browser geolocation with clear permission messaging and no default persistence of visitor coordinates.
- Product-category filters for meat, eggs, dairy, produce, honey, flowers, and prepared foods.
- Responsive list results with distance, location, key products, sales methods, verification state, and last-verified dates.
- Map-oriented panel that stays accessible when map tiles or API keys are not configured.
- Farm profile pages for public contact information, address, social links, products, hours, seasonality, sales methods, source attribution, and practice/certification claims.
- Farm submission foundation with client-side validation and a documented pending/unpublished moderation boundary.
- Domain model support for owner-claim, publication, verification, and source-record states.

## Architecture

The app uses Next.js, TypeScript, and the App Router.

```text
src/app/                     Route entry points
src/components/              Reusable client components
src/features/farms/          Farm domain types, taxonomy, seed data, repository boundary, search logic
src/features/submissions/    Submission validation schema
prisma/schema.prisma         PostgreSQL/PostGIS-ready relational model
```

The UI reads from `farmRepository`, which currently serves deterministic fictional records from `seed-farms.ts`. That repository boundary is intentionally small so a future PostgreSQL implementation can replace the local seed provider without rewriting pages.

Canonical farm records are modeled separately from `SourceRecord` entries. This allows multiple external records to point at the same farm while retaining provenance, license notes, import/check timestamps, and future duplicate-detection metadata.

## Data-source policy

Do **not** scrape, bulk-copy, or republish Eatwild listings in this project without permission. Eatwild may be useful for research or a future authorized integration, but this MVP contains no Eatwild data.

Preferred future ingestion sources include:

- USDA Local Food Directories, subject to API/download terms.
- State agriculture and extension directories with compatible reuse terms.
- Owner-submitted listings and owner-claimed corrections.
- Public certification datasets where license terms allow reuse.
- Permission-based integrations with directories such as Eatwild.

Each importer should create `SourceRecord` rows with source name, source URL, external ID, check timestamps, raw metadata placeholders, and usage/license notes. Importers should not overwrite owner-verified canonical fields without moderation. Duplicate detection should compare normalized name, address, phone, website, and geographic proximity before merge.

## Privacy, safety, and accessibility decisions

- Visitor geolocation is requested only after an explanation and is kept in browser state for the current search.
- The app does not persist a visitor's precise location by default.
- Farm phone, email, website, address, and social links are treated as intentionally public listing fields.
- Farming-practice statements are displayed as claims, not endorsements, unless certification evidence is attached.
- Forms and controls use labels, semantic HTML, keyboard-accessible inputs, visible focus states, and readable contrast.

## Environment variables

Copy `.env.example` to `.env.local` when connecting hosted services.

| Variable | Required now? | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | No | Supabase/PostgreSQL connection string for Prisma/PostGIS persistence. |
| `NEXT_PUBLIC_MAP_STYLE_URL` | No | Future MapLibre style URL; when empty, the accessible fallback is used. |
| `NEXT_PUBLIC_SUPABASE_URL` | No | Future Supabase browser client URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Future Supabase anon key. |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Future server-only admin operations; never expose to the browser. |

## Setup

Install dependencies:

```bash
npm ci
```

Run the development server:

```bash
npm run dev
```

Open <http://localhost:3000>.

## Quality commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

GitHub Actions runs the same lint, type-check, test, and build checks on pull requests.

## Database model

`prisma/schema.prisma` targets PostgreSQL and is ready for Supabase-hosted Postgres. Coordinates are stored as latitude/longitude decimals and include a PostGIS `geometry(Point, 4326)` field placeholder. A future migration should enable PostGIS and add a GiST index for radius searches.

Core models include:

- `Farm` for canonical listing data, contact fields, publication, claim, and verification states.
- `ProductCategory` and `FarmProduct` for standardized filters plus free-text product details and availability.
- `SourceRecord` for external provenance and license/usage notes.
- `PracticeClaim` for claims/certifications without implying endorsement.
- `FarmSubmission` for pending moderation intake.

## Seed data

All records in `src/features/farms/seed-farms.ts` are fictional demonstration listings created for this scaffold. They are deterministic so tests and local UI evaluation are stable.

Try searches such as:

- `Lancaster` or `17602`
- `Charlottesville`
- `Madison` or `53703`
- `Ames`

## Deferred production work

1. Add authenticated owner accounts and email verification.
2. Persist submissions to PostgreSQL as unpublished moderation records.
3. Build admin review, source merge, duplicate-resolution, and stale-listing workflows.
4. Add permission-based importers, starting with USDA Local Food Directories.
5. Add geocoding with rate limits, address normalization, and deduplication review.
6. Enable PostGIS migrations and geographic indexes for nationwide radius search.
7. Add a MapLibre renderer when tile/style configuration is selected.
8. Add monitoring, privacy-preserving analytics, and production deployment configuration.

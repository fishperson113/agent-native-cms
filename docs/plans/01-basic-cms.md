# Milestone 1 — CMS core (terminal-first)

**Status:** Implemented and verified on 2026-08-27.

## Goal

Deliver and test tenant-scoped Article domain, application use cases, and PostgreSQL persistence without changing the default Next.js frontend or creating delivery routes.

## Scope guard

In this milestone:

- Do not modify `src/app/`.
- Do not add API Route Handlers, dashboard pages, public pages, Markdown rendering, or browser tests.
- Do not wire the composition root into Next.js.
- Construct use cases/adapters explicitly in tests and terminal fixtures.

## Decisions to make at the start

- PostgreSQL runs locally through Docker Compose.
- Tests use isolated database state and deterministic IDs/clocks where useful.
- A seeded tenant is for terminal/manual scenarios only; application commands receive trusted tenant context explicitly.
- The article/presentation circular foreign key is deferred until the presentation table exists; M1 may keep `active_presentation_id` nullable without its final FK, then add the FK in M3.

## Work packages

### 1. Test and configuration foundation

- Add Vitest configuration and remove `--passWithNoTests` after the first real test exists.
- Add validated environment configuration for `DATABASE_URL`.
- Add `.env.example`, PostgreSQL Docker Compose, Drizzle config, schema, migration, and seed commands.
- Add database test helpers for migration, cleanup, and tenant fixtures.

### 2. Shared primitives and tenant domain

- Implement only required identifiers, clock/ID ports, and typed domain errors.
- Implement `Tenant`, tenant slug/status invariants, and `TenantRepository`.
- Unit-test creation, invalid slug, immutable identity, and disabled-tenant behavior.
- Implement the Drizzle tenant mapper/repository and integration-test tenant isolation semantics.

### 3. Article domain

- Implement `Article` aggregate with create, metadata/content changes, publish/unpublish, and presentation attach/detach behaviors.
- Enforce title-on-publish, required/valid slug, immutable tenant ownership, and controlled mutation.
- Define `ArticleRepository` with tenant ID in every lookup/delete signature.
- Unit-test all invariants and state transitions without database or framework dependencies.

### 4. Article persistence

- Add `articles` schema with `(tenant_id, slug)` uniqueness and tenant foreign key.
- Implement persistence mapper and Drizzle repository.
- Integration-test mapper round trips, CRUD, tenant-scoped lookups, slug uniqueness per tenant, and cross-tenant denial/non-disclosure.

### 5. Article application use cases

- Implement create, update content, update metadata, publish, unpublish, delete, get by ID, get by slug, and list handlers.
- Keep orchestration in handlers and rules in aggregates/value objects.
- Use fake repositories for focused application tests; add a smaller real-Postgres vertical integration suite.
- Define typed application errors now; HTTP mapping is deferred to M6.

### 6. Terminal acceptance scenario

- Provide a script or dedicated integration test that seeds Tenant A and Tenant B.
- Create/update/publish/list/get/delete articles through application handlers.
- Demonstrate duplicate-slug behavior and prove Tenant B cannot read/mutate Tenant A data.
- Print only concise scenario results; CI correctness comes from assertions, not log inspection.

## Primary file targets

```text
docker-compose.yml
.env.example
drizzle.config.ts
src/shared/kernel/
src/infrastructure/{config,database}/
src/modules/tenant/{domain,application,infrastructure}/
src/modules/content/{domain,application,infrastructure}/
```

`src/app/` is explicitly not a target.

## Terminal verification

```text
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm test
pnpm test:integration
pnpm lint
pnpm typecheck
pnpm build
```

Exact DB script names may be adjusted during implementation but must be documented in README.

## Exit criteria

- Real domain, application, and PostgreSQL integration tests exist and pass.
- Migrations and seed run from a fresh local database.
- Terminal scenarios cover the full Article lifecycle without HTTP or UI.
- Every repository lookup is tenant-scoped and cross-tenant tests pass.
- `src/app/` remains the untouched create-next-app default.
- Lint, typecheck, tests, and production build pass.

## Deferred to M6

Current-tenant delivery resolution, Zod HTTP schemas, Route Handlers, error-to-HTTP mapping, dashboard/editor, Markdown preview/default renderer, and public article URLs.

# Agent-Native CMS PoC

A modular-monolith proof of concept for a stable hosted CMS kernel that external coding agents can program through MCP tools and uploadable presentation artifacts.

## Run locally

- [Quick Start](QUICK_START.md) — shortest path from clone to a running CMS and connected coding agent.
- [Getting Started](GETTING_STARTED.md) — complete local setup, admin/MCP configuration, verification, and troubleshooting.
- [Render + Supabase deployment](docs/deployment/render-supabase.md) — free-tier Blueprint, database connection mode, and CI/CD setup.

## Current status

Milestones 1–10 are implemented: Tenant/Article core, local and hosted MCP article tools, `ArticlePresentation` artifact persistence, the Article SDK/esbuild compiler, the complete presentation lifecycle, reliability hardening, browser delivery, stateful hosted MCP sessions, fixed revocable credentials, a REST-only operator control plane, and a durable PostgreSQL audit stream. Admin credentials are never accepted by MCP. Activation/reset are transactional, contracts are versioned, telemetry is source-safe, and CI covers the full quality gate. The kernel contains no model-provider integration; uploaded content/programs do not rebuild or redeploy it. The executable implementation sequence is documented in [`docs/plans/`](docs/plans/00-roadmap.md).

The home page is a stable CMS-owned feed of every published article. Uploaded presentation programs are evaluated only on the matching `/articles/[articleId]/[slug]` reading page, with the default reader used when no presentation is active or the runtime module fails. The article ID is authoritative so tenants can reuse the same slug safely.

## Stack

- Next.js App Router, React, TypeScript, Tailwind CSS
- PostgreSQL, Drizzle ORM
- Zod at system boundaries
- esbuild for generated TSX compilation
- Model Context Protocol SDK for coding-agent integration
- Vitest for unit, application, and infrastructure tests

## Local commands

```bash
pnpm install
copy .env.example .env
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm db:seed:delivery
pnpm lint
pnpm typecheck
pnpm check:architecture
pnpm test
pnpm test:integration
pnpm demo:terminal
pnpm demo:mcp
pnpm demo:presentation-core
pnpm demo:presentation-mcp
pnpm demo:reliability
pnpm demo:delivery
pnpm demo:stateful-mcp
pnpm demo:credentials
pnpm demo:authorization
pnpm demo:audit
pnpm build
```

`pnpm demo:terminal` executes an Article lifecycle against real PostgreSQL: two tenants, create/update/publish/query/delete, duplicate-slug enforcement, and cross-tenant isolation. Use `pnpm db:down` when the local database is no longer needed.

`pnpm demo:mcp` connects an MCP client to the CMS tool server and exercises both article and presentation tools against PostgreSQL.

`pnpm demo:presentation-core` uploads valid and invalid TSX fixtures through the application core, bundles valid programs with the CMS SDK/runtime into browser artifacts, and persists compiled/failed records in PostgreSQL. Uploading does not activate a presentation or change kernel files.

`pnpm demo:presentation-mcp` runs the coding-agent lifecycle over MCP: discover the SDK, upload/compile TSX, inspect versions, activate, preserve the active version after a failed upload, roll back by activating an older version, and reset to the default presentation.

`pnpm demo:reliability` proves transaction rollback on injected persistence failure, repeated-upload isolation, active-artifact preservation after compile failure, and cascade deletion of article-owned presentation artifacts.

`pnpm demo:delivery` proves bearer authentication for hosted MCP, published/draft delivery separation, and versioned active JavaScript artifact delivery.

`pnpm demo:stateful-mcp` initializes a hosted MCP session, reuses its `MCP-Session-Id` for later tool calls, terminates it with `DELETE`, verifies closed-session rejection, and checks the protected runtime health endpoint.

`pnpm demo:credentials` proves database tenant/admin key issuance, scrypt verification, tenant resolution, independent revocation, and disabled-tenant rejection. `pnpm demo:authorization` proves that admin keys are REST-only, tenant keys retain MCP access, admin sessions are revocable, and safe control-plane snapshots never contain plaintext keys.

`pnpm demo:audit` proves monotonic cursor replay, PostgreSQL `LISTEN/NOTIFY` wake-ups, safe MCP tool lifecycle events, and resumable audit history. The admin-only history endpoint is `/api/admin/audit`; the live SSE endpoint is `/api/admin/audit/stream` and accepts `Last-Event-ID` on reconnect.

Integration tests automatically derive an isolated `_test` database, create it when needed, and run migrations before the suite. Set `TEST_DATABASE_URL` to override it. Test cleanup never targets the development CMS database.

`pnpm db:seed:delivery` idempotently creates one published article with an active presentation for browser testing. Keep `pnpm dev` running, open the printed URL, then use an MCP coding agent to upload and activate another presentation version.

To connect a local coding-agent client over stdio, set `CMS_MCP_STDIO_API_KEY` to an active tenant key and configure it to run:

```bash
pnpm --dir C:\workspace\agent-native-cms run mcp:stdio
```

Copyable instructions and a JSON command snippet are available in `docs/agent-integration/coding-agent-instructions.md`.

For a hosted client, point a stateful Streamable HTTP MCP connection at `https://YOUR_HOST/api/mcp` and send `Authorization: Bearer YOUR_TENANT_KEY`. The server resolves tenant scope from the database credential, issues `MCP-Session-Id`, and rejects revoked keys. Clients should not manufacture a session ID or send a tenant ID.

Open `http://localhost:3000/admin` for the operator UI. Bootstrap admin credentials locally, then manage tenants, tenant keys, articles, and live MCP sessions through REST-backed controls. Administration is documented in [`docs/operations/mcp-administration.md`](docs/operations/mcp-administration.md).

Hosted-kernel operations and recovery assumptions are documented in [`docs/operations/hosted-kernel.md`](docs/operations/hosted-kernel.md) and [`docs/operations/backup-and-recovery.md`](docs/operations/backup-and-recovery.md).

Run `pnpm dev` to open the publication. Drafts remain hidden until an agent publishes them. Activating a compiled presentation changes that article's reader without restarting Next.js; the landing layout is unaffected.

## Architectural constraints

- Creating content/programs must not edit, rebuild, redeploy, or stop the hosted kernel.
- The external coding agent owns generation; the kernel owns persistence, compilation, activation, and dynamic loading.
- Compilation validates syntax and the baseline article UX contract; sandboxing, permissions, and broader source-security restrictions remain deferred.
- Every newly uploaded presentation must satisfy the versioned article experience contract: ArticleRoot, Hero, fluid sizing, and stable viewport units. The CMS always owns article navigation and the Back to home link.
- Domain and application layers cannot depend on Next.js, Drizzle, React, esbuild, MCP, or a model-provider SDK.
- Every article and presentation lookup is tenant-scoped.
- The PoC models `ArticlePresentation`, not a generic plugin system.

## Plans

1. [Roadmap and dependency map](docs/plans/00-roadmap.md)
2. [Milestone 1 — CMS core, terminal-first](docs/plans/01-basic-cms.md)
3. [Milestone 2 — External coding-agent integration](docs/plans/02-ai-content.md)
4. [Milestone 3 — Uploadable presentation program core](docs/plans/03-programmable-article-runtime.md)
5. [Milestone 4 — MCP presentation lifecycle](docs/plans/04-agent-generated-presentation.md)
6. [Milestone 5 — Reliability and hosted-kernel readiness](docs/plans/05-hardening-and-poc-completion.md)
7. [Milestone 6 — Hosted delivery and dynamic runtime](docs/plans/06-delivery-ui-deferred.md)
8. [Milestone 7 — Stateful MCP runtime](docs/plans/07-stateful-mcp-runtime.md)
9. [Milestone 8 — Admin and tenant credentials](docs/plans/08-admin-tenant-credentials.md)
10. [Milestone 9 — Authorization enforcement](docs/plans/09-authorization-enforcement.md)
11. [Milestone 10 — Durable audit event stream](docs/plans/10-audit-event-stream.md)

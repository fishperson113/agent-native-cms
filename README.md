# Agent-Native CMS

An experimental, agent-programmable CMS built around a stable hosted kernel.
Coding agents connect through the Model Context Protocol (MCP) to create and
publish articles, then upload presentation programs that the kernel compiles
to change an individual article experience without rebuilding or redeploying
the CMS.

[Live demo](https://agent-native-cms.onrender.com/) ·
[Quick start](QUICK_START.md) ·
[Getting started](GETTING_STARTED.md) ·
[Deployment guide](docs/deployment/render-supabase.md)

## Why this project exists

Traditional headless CMS platforms let applications fetch content, but the
application still owns every presentation change. Agent-Native CMS explores a
different boundary:

- the CMS kernel owns data, authentication, compilation, activation, delivery,
  and audit history;
- coding agents own content creation and article-level presentation code;
- publishing content or activating a presentation never requires a kernel
  restart or site deployment.

The public home page remains CMS-owned and aggregates published articles from
all tenants. Dynamic presentation code runs only on its matching article page.

## Features

- Multi-tenant article CRUD with draft and published states
- Stateful Streamable HTTP MCP endpoint for coding agents
- Fixed, revocable tenant credentials and a separate REST-only admin role
- Agent-facing article and presentation tools
- Versioned TypeScript/TSX presentation uploads compiled with esbuild
- Activate, roll back, or reset an article presentation without redeploying
- Default reader fallback when no custom presentation is active
- Collision-safe public URLs using article UUIDs and human-readable slugs
- PostgreSQL-backed audit history with resumable SSE streaming
- Admin UI for tenants, credentials, articles, sessions, and audit activity
- Unit, integration, architecture, and production-build checks in CI

## How it works

1. An operator creates a tenant and issues a revocable tenant key.
2. A coding agent connects to `POST /api/mcp` using that key.
3. The agent creates and publishes article content through MCP tools.
4. Optionally, the agent reads the presentation SDK contract and uploads a TSX
   component.
5. The kernel validates and compiles the component into a versioned browser
   artifact.
6. Activating that artifact changes only the matching article reader. The
   landing page and kernel deployment remain untouched.

Tenant credentials define ownership for writes. Public delivery is global:
every published article can appear in the shared publication feed.

## Tech stack

- Next.js App Router, React, TypeScript, and Tailwind CSS
- PostgreSQL and Drizzle ORM
- Model Context Protocol SDK
- esbuild for presentation compilation
- Zod for boundary validation
- Vitest for unit and integration testing

## Quick start

### Prerequisites

- Node.js 20.9 or newer
- pnpm 10
- Docker Desktop with Docker Compose

### Install and run

```bash
pnpm install
cp .env.example .env
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm mcp:admin bootstrap-admin --name "Local operator" --confirm
pnpm dev
```

On Windows PowerShell, replace `cp .env.example .env` with:

```powershell
Copy-Item .env.example .env
```

The admin bootstrap command prints a one-time plaintext admin key. Keep it for
the web control plane and never give it to a coding agent.

Once the server is running, open:

- Publication: [http://localhost:3000](http://localhost:3000)
- Admin control plane: [http://localhost:3000/admin](http://localhost:3000/admin)
- MCP endpoint: `http://localhost:3000/api/mcp`

For an immediately visible example article, run `pnpm db:seed:delivery` before
starting the application. See the [Quick Start](QUICK_START.md) for the complete
local flow.

## Connect a coding agent

Sign in to `/admin`, create or select a tenant, issue a tenant key, and use
**Copy setup prompt**. The generated prompt contains the hosted MCP URL and the
tenant credential required by the coding agent.

A generic Streamable HTTP client uses:

```json
{
  "url": "https://YOUR_HOST/api/mcp",
  "headers": {
    "Authorization": "Bearer YOUR_TENANT_KEY"
  }
}
```

The server resolves tenant ownership from the credential and returns an
`MCP-Session-Id` during initialization. Clients must reuse that session ID and
must not send or invent a tenant ID. Admin credentials are never accepted by
the MCP endpoint.

Detailed client instructions are available in
[`docs/agent-integration/coding-agent-instructions.md`](docs/agent-integration/coding-agent-instructions.md).

## Development

Run the complete quality gate:

```bash
pnpm check:architecture
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
```

Useful commands:

| Command | Purpose |
| --- | --- |
| `pnpm db:up` | Start the local PostgreSQL container |
| `pnpm db:down` | Stop the local Docker Compose stack |
| `pnpm db:migrate` | Apply database migrations |
| `pnpm db:seed` | Seed baseline local data |
| `pnpm db:seed:delivery` | Seed a browser-delivery example |
| `pnpm demo:mcp` | Exercise article and presentation tools over MCP |
| `pnpm demo:audit` | Verify audit replay and live event streaming |
| `pnpm mcp:stdio` | Run the optional local stdio MCP transport |

Integration tests use an isolated test database. Set `TEST_DATABASE_URL` to
override the automatically derived database URL.

## Architecture and operations

- [Hosted kernel operations](docs/operations/hosted-kernel.md)
- [Admin and credential operations](docs/operations/mcp-administration.md)
- [Backup and recovery](docs/operations/backup-and-recovery.md)
- [Render and Supabase deployment](docs/deployment/render-supabase.md)

The domain and application layers do not depend on Next.js, Drizzle, React,
esbuild, MCP, or any model-provider SDK. The kernel deliberately contains no
model integration: generation happens in the external coding agent.

## Project status

This repository is an experimental proof of concept. It demonstrates the full
agent-to-publication workflow, but uploaded presentation programs are not yet
isolated strongly enough to treat arbitrary third-party code as trusted
production workloads. Review the security model before exposing write access
outside a controlled environment.

## Future work

### Capability-based presentation sandbox

Run uploaded presentation programs inside an isolated iframe or worker with a
strict Content Security Policy, CPU and memory budgets, and an explicit
capability API for article data, navigation, and approved media. Signed
artifacts and per-capability audit events would let operators safely accept
presentation code from less-trusted tenants without giving that code access to
the CMS page or kernel runtime.

The broader proposal—language-neutral presentation manifests, compiler/runtime
providers, typed policy pipelines, reversible lifecycle effects, and durable
publication events—is documented in
[Capability-oriented presentation runtime](docs/future/capability-oriented-presentation-runtime.md).

## Contributing

Issues and pull requests are welcome. Before opening a pull request:

1. Keep domain and application code independent from delivery frameworks.
2. Add tests for behavior changes and tenant authorization boundaries.
3. Run the complete quality gate shown above.
4. Never commit tenant keys, admin keys, database credentials, or generated
   presentation artifacts containing secrets.

## License

Licensed under the [MIT License](LICENSE).

# Quick Start

Run the complete Agent-Native CMS locally with PostgreSQL, the publication UI,
the admin control plane, and the hosted MCP endpoint.

## Prerequisites

- Node.js 20.9 or newer
- pnpm 10 (`packageManager` is pinned to `pnpm@10.28.2`)
- Docker Desktop with Docker Compose

## 1. Install and configure

From the repository root:

```powershell
pnpm install
Copy-Item .env.example .env
```

macOS/Linux equivalent:

```bash
pnpm install
cp .env.example .env
```

The default environment uses PostgreSQL on `localhost:15432`, so it does not
claim the usual local port `5432`.

## 2. Start PostgreSQL and prepare the database

```powershell
pnpm db:up
pnpm db:migrate
pnpm db:seed
```

Optional: add a published article and active presentation for immediate browser
testing:

```powershell
pnpm db:seed:delivery
```

## 3. Create the one admin key

Run this once on a fresh database:

```powershell
pnpm mcp:admin bootstrap-admin --name "Local operator" --confirm
```

Copy the returned `plaintextKey`. The admin key is intentionally not stored in
recoverable form and is used only to sign in to the web control plane. Never
give it to a coding agent.

## 4. Start the CMS kernel

```powershell
pnpm dev
```

Open:

- Publication: [http://localhost:3000](http://localhost:3000)
- Admin: [http://localhost:3000/admin](http://localhost:3000/admin)
- Hosted MCP: `http://localhost:3000/api/mcp`

The MCP server is part of the Next.js CMS kernel. You do not need to start a
second MCP process for hosted Streamable HTTP connections.

## 5. Connect a coding agent

In `/admin`:

1. Choose an existing seeded tenant or create a new tenant.
2. Issue a tenant key.
3. Select **Copy setup prompt** beside that key.
4. Paste the generated prompt into the coding agent.

The generated setup uses the hosted MCP URL and fills in the tenant key. The
key resolves tenant scope on the server; the agent must not supply a tenant ID.

## Verify the setup

```powershell
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm build
```

For a shorter end-to-end audit/MCP check:

```powershell
pnpm demo:audit
```

For configuration details and troubleshooting, continue with
[Getting Started](GETTING_STARTED.md).

# Getting Started

This guide explains the complete local setup for Agent-Native CMS: PostgreSQL,
database initialization, admin access, tenant credentials, the hosted MCP
connection, testing, and common recovery steps.

If you only want the shortest path to a running system, use
[Quick Start](QUICK_START.md).

## What runs locally

One `pnpm dev` process hosts all HTTP surfaces:

```text
Next.js CMS kernel · http://localhost:3000
├─ /                         public landing page
├─ /articles/[slug]          dynamically loaded article presentation
├─ /admin                    admin-only operator UI
├─ /api/mcp                  stateful Streamable HTTP MCP server
├─ /api/health               public kernel and PostgreSQL readiness
├─ /api/admin/*              admin REST control plane
└─ /api/admin/audit/stream   resumable audit SSE stream

PostgreSQL · localhost:15432
└─ content, presentations, credentials, sessions, and audit events
```

Creating an article or uploading a presentation writes data/artifacts to
PostgreSQL. It does not edit, rebuild, restart, or redeploy the kernel.

## Prerequisites

| Dependency | Recommended version | Check |
|---|---:|---|
| Node.js | 20.9+ | `node --version` |
| pnpm | 10.x | `pnpm --version` |
| Docker Desktop | Current | `docker version` |
| Docker Compose | Compose v2 | `docker compose version` |

The repository pins `pnpm@10.28.2`. If pnpm is not installed, install that
version using your preferred Node package-manager setup before continuing.

## Install dependencies

Change into the cloned repository and install packages:

```powershell
Set-Location C:\workspace\agent-native-cms
pnpm install
```

The absolute path above matches the current local workspace. For another clone,
replace it with that repository path.

## Configure the environment

Create the local environment file:

```powershell
Copy-Item .env.example .env
```

The defaults are ready for the included Docker Compose service:

```dotenv
DATABASE_URL=postgresql://agent_native_cms:agent_native_cms@localhost:15432/agent_native_cms
TEST_DATABASE_URL=postgresql://agent_native_cms:agent_native_cms@localhost:15432/agent_native_cms_test
CMS_TENANT_ID=10000000-0000-4000-8000-000000000001
CMS_MCP_SESSION_IDLE_TIMEOUT_MS=1800000
CMS_MCP_MAX_SESSIONS=100
CMS_MCP_ALLOWED_ORIGINS=*
```

`CMS_MCP_STDIO_API_KEY` is optional and is needed only for the legacy/local
stdio command. Hosted MCP clients use a tenant key in the HTTP Authorization
header and do not need this variable.

Do not commit `.env` or paste real tenant/admin keys into repository files.

## Start PostgreSQL

```powershell
pnpm db:up
docker compose ps
```

The `agent-native-cms-postgres` container should report `healthy`. Its container
port `5432` is exposed as host port `15432`.

Apply every migration, including the audit event schema:

```powershell
pnpm db:migrate
```

Seed two base tenants:

```powershell
pnpm db:seed
```

The seed is safe to run again. For a browser-ready published article and active
presentation, also run:

```powershell
pnpm db:seed:delivery
```

## Bootstrap admin access

The system allows one active admin credential. On a fresh database, create it:

```powershell
pnpm mcp:admin bootstrap-admin --name "Local operator" --confirm
```

Save the returned `plaintextKey` in your password manager. Only its secure hash
is persisted, so the CMS cannot reveal it later. This key belongs to the human
operator and is accepted by the admin REST login only; `/api/mcp` rejects it.

If the command reports that an active admin already exists, do not create or
revoke another key just to continue. Use the existing admin key.

## Start the kernel

Development mode:

```powershell
pnpm dev
```

Production-mode local check:

```powershell
pnpm build
pnpm start
```

Both modes expose the same application URLs on port `3000` by default. Keep the
kernel running while browsers and coding agents use it.

## Configure the admin control plane

1. Open [http://localhost:3000/admin](http://localhost:3000/admin).
2. Sign in using the admin `plaintextKey`.
3. Create a tenant or use one of the seeded tenants.
4. Issue a fixed tenant key from the **Tenant keys** section.
5. Use **Copy setup prompt** to generate agent-ready MCP instructions with the
   URL and key already filled in.

Active tenant keys are recoverable from the protected local admin page for this
PoC. They remain valid until revoked. Revoking a key closes its active MCP
sessions; disabling a tenant closes every session belonging to that tenant.

## Connect a coding agent over hosted MCP

The preferred local integration is stateful Streamable HTTP:

```json
{
  "url": "http://localhost:3000/api/mcp",
  "headers": {
    "Authorization": "Bearer YOUR_TENANT_KEY"
  }
}
```

The exact outer configuration field varies by coding-agent client. The URL,
transport, and authorization header stay the same. During initialization the
kernel returns `MCP-Session-Id`; the client must reuse it for later requests.

Do not start `pnpm mcp:stdio` for this hosted connection. That command is only
for clients that explicitly require a local stdio MCP process. Stdio setup is
documented in
[Coding-agent integration instructions](docs/agent-integration/coding-agent-instructions.md).

## First agent workflow

After the client reports that MCP is connected, ask the coding agent:

```text
Use the connected cms_* MCP tools to inspect the tenant, create a draft article,
write its Markdown, publish it, and report the final article URL. Do not edit or
restart the CMS kernel. Keep the default presentation for this first test.
```

Then verify that the published article appears on the landing page. A later
agent request can retrieve `cms_get_presentation_sdk`, upload TSX, compile it,
and activate it without restarting Next.js.

## Audit verification

Authentication, MCP sessions, tool calls, tenant/key administration, and article
deletion are written to the append-only `audit_events` table.

With a valid admin browser session:

- History: `GET /api/admin/audit?afterId=0&limit=100`
- Live SSE: `GET /api/admin/audit/stream`
- Reconnect cursor: `Last-Event-ID: <audit event id>`

The current milestone provides APIs and streaming, not a visual audit viewer.

## Tests and demos

Run the complete quality gate:

```powershell
pnpm lint
pnpm typecheck
pnpm check:architecture
pnpm test:unit
pnpm test:integration
pnpm build
```

Useful focused demos:

```powershell
pnpm demo:terminal       # article lifecycle against PostgreSQL
pnpm demo:mcp            # MCP article and presentation tools
pnpm demo:delivery       # hosted MCP and public delivery
pnpm demo:authorization  # admin/tenant authorization boundaries
pnpm demo:audit          # durable cursor replay and notifications
```

Integration tests use `TEST_DATABASE_URL` or automatically derive an isolated
database ending in `_test`. They do not clean or target the development CMS
database.

## Common problems

### PostgreSQL container does not start

Inspect the service first:

```powershell
docker compose ps
docker compose logs postgres
Get-NetTCPConnection -LocalPort 15432 -ErrorAction SilentlyContinue
```

If another application owns `15432`, stop that application or change the host
port in `docker-compose.yml` and update both database URLs in `.env` to match.

### Port 3000 is already occupied

Identify the listener:

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen
```

Stop the old CMS process or run Next.js on another port:

```powershell
pnpm exec next dev --port 3001
```

If you change the port, also use the new origin in the hosted MCP URL and agent
setup prompt.

### Database errors after pulling new code

Apply migrations again:

```powershell
pnpm db:up
pnpm db:migrate
```

Do not generate a new migration merely to start an existing checkout.

### Admin login fails

- Confirm PostgreSQL is healthy and migrations are current.
- Confirm you are using the admin key, not a tenant key.
- Admin keys are not accepted by MCP, and tenant keys are not admin sessions.
- If the original admin plaintext key is lost, follow an explicit recovery plan;
  do not revoke credentials blindly from the database.

### Coding agent receives `401 Unauthorized`

- Copy a currently active tenant key from `/admin`.
- Confirm the header is exactly `Authorization: Bearer <tenant key>`.
- Confirm the credential has not been revoked and its tenant is active.
- Reconnect so the MCP client initializes a new stateful session.

### Full local reset

The following operation permanently deletes the Docker volume and all local CMS
data, including articles, keys, sessions, presentations, and audit events:

```powershell
docker compose down --volumes
pnpm db:up
pnpm db:migrate
pnpm db:seed
```

Use it only for a disposable local environment. Bootstrap a new admin key after
the reset.

## Stop the local environment

Stop Next.js with `Ctrl+C`, then stop PostgreSQL while keeping its data:

```powershell
pnpm db:down
```

For operational details, see
[MCP administration](docs/operations/mcp-administration.md) and
[Hosted-kernel operations](docs/operations/hosted-kernel.md).

To deploy the same kernel with Git-driven CI/CD, see
[Render + Supabase deployment](docs/deployment/render-supabase.md).

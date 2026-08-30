# MCP administration

The control plane supports exactly two credential roles: global `admin` and tenant-bound `tenant`. Keys are fixed until explicitly revoked. The single admin key remains hash-only; active tenant keys are recoverable from the protected local admin UI so the operator can resend setup instructions.

Run database migrations before credential commands:

```powershell
pnpm db:migrate
```

## First admin key

Bootstrap succeeds only when there is no active admin credential:

```powershell
pnpm mcp:admin bootstrap-admin --name "Root operator" --confirm
```

Save `plaintextKey` immediately. It cannot be listed or recovered later. Open `/admin` and use it only in the operator login form. Admin keys are never accepted by MCP.

## Tenant management

```powershell
pnpm mcp:admin tenant:list
pnpm mcp:admin tenant:create --name "Tenant name" --slug "tenant-slug"
pnpm mcp:admin tenant:set-status --tenant-id TENANT_UUID --status disabled
pnpm mcp:admin tenant:set-status --tenant-id TENANT_UUID --status active
```

Disabling a tenant rejects its keys on the next MCP request and closes the matching session.

## Issue, list, and revoke keys

```powershell
pnpm mcp:admin key:issue --role tenant --tenant-id TENANT_UUID --name "Coding agent"
pnpm mcp:admin key:issue --role admin --name "Operations key"
pnpm mcp:admin key:list
pnpm mcp:admin key:list --role tenant --tenant-id TENANT_UUID
pnpm mcp:admin key:revoke --credential-id CREDENTIAL_UUID --confirm
```

Key listing returns metadata and safe prefixes only. Rotation is manual: issue a replacement, update the agent connection, verify it, and revoke the old credential.

## Operator UI

Start the CMS kernel and visit `http://localhost:3000/admin`. The UI creates tenants, issues and revokes tenant keys, moderates articles, and closes active MCP sessions. Active tenant keys can be viewed again, copied directly, or exported inside a pre-filled coding-agent setup prompt. The single admin key remains hash-only and is omitted from the UI entirely to prevent accidental revocation.

Keys created before recoverable tenant-key storage was enabled still show only their safe prefix. Issue one replacement through the UI and revoke the legacy key after the agent reconnects.

The old environment-wide hosted MCP key is no longer an authentication path. For an explicitly local stdio connection, set `CMS_MCP_STDIO_API_KEY` to an active tenant key. Never use the admin key in an agent configuration.

## Article moderation

The local operator can inspect and delete tenant articles explicitly:

```powershell
pnpm mcp:admin article:list --tenant-id TENANT_UUID
pnpm mcp:admin article:get --tenant-id TENANT_UUID --article-id ARTICLE_UUID
pnpm mcp:admin article:delete --tenant-id TENANT_UUID --article-id ARTICLE_UUID --confirm
```

Deletion remains tenant-scoped and uses the existing article aggregate deletion behavior. Remote administration is REST and UI only; there are intentionally no admin MCP tools.

## Audit history and live stream

M10 records authentication, MCP session/tool lifecycle, tenant/key changes, article deletion, and operator session actions in append-only PostgreSQL rows. Event metadata rejects bearer values, keys, hashes, Markdown, TSX source, compiled code, headers, and arbitrary request payloads.

- `GET /api/admin/audit?afterId=CURSOR&limit=100` returns ordered, cursor-paginated history.
- Filters include `after`, `before`, `eventType`, `outcome`, `tenantId`, `credentialId`, `sessionId`, `correlationId`, `resourceType`, and `resourceId`.
- `GET /api/admin/audit/stream` opens an admin-cookie-authenticated SSE stream.
- Reconnect with `Last-Event-ID`; the server replays canonical database rows before continuing live.

PostgreSQL `LISTEN/NOTIFY` is only a wake-up signal. Consumers always read the event row from `audit_events`, so reconnects do not depend on transient notifications. Events are retained indefinitely for the PoC; archival is deferred until measured volume requires it.

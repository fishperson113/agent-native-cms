# Milestone 9 — Operator control plane and authorization enforcement

## Status

Implemented.

## Boundary

There are two roles but two deliberately separate protocols:

- A `tenant` credential connects to the hosted or local MCP server. The server derives tenant scope from the credential and never trusts a client-supplied tenant ID.
- An `admin` credential is human-operated. It is accepted only by the ordinary REST login endpoint and operator UI. It is permanently rejected by MCP and must never be included in coding-agent instructions.

The environment-wide MCP bearer-key fallback has been removed. Hosted MCP authentication is database-backed. Stdio requires an explicit active tenant credential in `CMS_MCP_STDIO_API_KEY` and rejects an admin credential.

## Admin session model

`POST /api/admin/session` exchanges an admin key for a random eight-hour session token. Only a SHA-256 hash of that high-entropy token is stored in `admin_sessions`. The browser receives an `HttpOnly`, `SameSite=Strict` cookie and never stores the admin key in local storage.

Revoking an admin credential invalidates its active UI sessions. State-changing REST requests enforce same-origin access. Current credentials and runtime state use non-cacheable responses.

## REST control plane

- `GET /api/admin/snapshot` lists tenants, tenant credentials, articles, runtime status, and active MCP sessions. Active tenant credentials include their operator-recoverable plaintext key. The single admin credential is omitted entirely so the UI cannot accidentally revoke it.
- `POST /api/admin/tenants` creates a tenant.
- `PATCH /api/admin/tenants/:tenantId` enables or disables a tenant.
- `POST /api/admin/credentials` issues tenant credentials only. Tenant plaintext is retained for the authenticated operator UI so keys and pre-filled setup prompts can be copied again later.
- `DELETE /api/admin/credentials/:credentialId` revokes a credential and closes its active MCP sessions.
- `DELETE /api/admin/articles/:tenantId/:articleId` deletes an explicitly tenant-scoped article.
- `DELETE /api/admin/runtime/sessions/:sessionId` closes a live MCP session.

The operator UI is available at `/admin`. The single admin credential is bootstrapped and managed through the trusted local CLI; it is never listed by the UI. The UI deliberately issues and revokes tenant keys only.

Tenant keys are intentionally recoverable for this single-operator deployment. This improves support UX but means a database disclosure also discloses active tenant keys. Admin keys remain hash-only and unrecoverable.

## Enforcement

1. Hosted MCP requires an active database credential.
2. Admin actors receive HTTP 403 before MCP initialization.
3. MCP sessions remain bound to credential and tenant identity.
4. Tenant disable closes all live sessions for that tenant.
5. Credential revoke closes all live sessions for that credential.
6. Article reads and deletion retain tenant predicates as defense in depth.
7. Admin article deletion requires both exact tenant and article IDs.

## Exit criteria

- Admin credentials cannot enumerate or call MCP tools.
- Coding agents only receive tenant keys.
- The operator can manage tenants, tenant keys, articles, and runtime sessions from a responsive UI.
- No existing tenant content or presentation workflow changes after MCP connection setup.
- Durable audit events remain the next milestone and will record these REST and MCP actions as an append-only event stream.

# Milestone 7 — Stateful MCP runtime

## Status

Implemented on 2026-08-28.

## Goal

Replace the current one-request/one-server HTTP adapter with a long-lived Streamable HTTP MCP runtime that owns sessions across requests. Stdio remains available only as a local development fallback and is no longer the primary integration path.

## Product decision

For the first hosted version, run a single long-lived Node.js/Next.js process and keep active MCP sessions in process memory. PostgreSQL remains the source of truth for CMS data. A process restart may end active sessions, but it must not lose articles, presentations, credentials, or audit events; clients reconnect and initialize a new session.

This deliberately avoids Redis, distributed session coordination, and multi-instance routing until horizontal scaling is required.

## Runtime shape

```text
Coding agent
  ↓ Streamable HTTP + Bearer key
/api/mcp
  ↓
CmsMcpSessionManager (process singleton)
  ├─ sessionId → transport + server + actor
  ├─ idle timeout / cleanup
  └─ graceful shutdown
          ↓
CMS application kernel → PostgreSQL
```

## Work packages

### 1. Session manager

- Generate an `MCP-Session-Id` during initialization.
- Keep one MCP transport/server pair per active session.
- Route subsequent `GET`, `POST`, and `DELETE` requests by session ID.
- Reject missing, unknown, or actor-mismatched session IDs with stable protocol errors.
- Record creation time, last activity, credential ID, tenant ID where applicable, and connection state.

### 2. Lifecycle policy

- Configure a simple idle timeout, initially 30 minutes.
- Close a session on MCP `DELETE`, timeout, server shutdown, or revoked credentials.
- Run a bounded cleanup interval without creating one timer per session.
- Add graceful shutdown so active transports and the database pool close predictably.
- Put a conservative process-level cap on active sessions and return a stable capacity error when reached.

### 3. Stateful Streamable HTTP

- Configure the MCP SDK with a real `sessionIdGenerator` instead of `undefined`.
- Support resumable protocol events through the SDK event-store contract where practical.
- Keep protocol resumability storage separate from the business audit log.
- Preserve CORS and MCP protocol headers; restrict allowed origins through configuration instead of a permanent wildcard.

### 4. Runtime status

- Add internal health/readiness checks for process state, database connectivity, and session-manager readiness.
- Expose active session count and runtime start time to the future admin control plane.
- Do not expose session details publicly.

## Acceptance tests

- Initialize once, then call multiple tools using the same session ID.
- Two concurrent sessions do not share transport state.
- A session cannot be reused with a different credential.
- `DELETE` closes a session and later calls fail predictably.
- Idle sessions are removed.
- A runtime restart loses sessions but preserves all CMS records.
- Existing article and presentation MCP acceptance flows still pass over HTTP.

## Exit criteria

- Hosted coding agents use Streamable HTTP as the default transport.
- MCP sessions survive across requests within one running process.
- Session lifecycle is bounded, observable, and terminal-testable.
- No authentication behavior is made more permissive during the transition.

## Implemented result

- A process-singleton session manager owns one MCP server/transport per session while sharing one PostgreSQL connection pool.
- Session initialization, reuse, credential/tenant binding, capacity, timeout sweeping, `DELETE`, and shutdown are covered by tests.
- Per-session in-memory protocol event stores enable SDK resumability without conflating protocol events with the future durable audit stream.
- The authenticated `/api/mcp/health` endpoint reports database readiness and aggregate session capacity without exposing session IDs.
- `CMS_MCP_SESSION_IDLE_TIMEOUT_MS`, `CMS_MCP_MAX_SESSIONS`, and `CMS_MCP_ALLOWED_ORIGINS` provide bounded runtime configuration.
- Stdio remains available as a development fallback; hosted stateful Streamable HTTP is the default documented connection.

## Non-goals

- Cross-instance session replication.
- Redis or a message broker.
- A web management dashboard.
- OAuth or delegated human login.

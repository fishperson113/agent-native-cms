# Hosted-kernel operational handoff

## Upload path

The long-running kernel receives new content and presentation programs through its MCP adapter. An external coding agent calls the versioned tools to create/update Markdown, retrieve the presentation SDK, upload TSX, inspect compilation, and activate a compiled artifact.

An upload writes source and compiled artifact records to PostgreSQL. Activation changes presentation state and the article pointer in one short transaction. Neither operation edits kernel source, invokes a model provider, rebuilds Next.js, redeploys the process, or restarts it.

Both local stdio and hosted Streamable HTTP are implemented. Hosted HTTP is the primary integration path. The adapter is available at `GET|POST|DELETE /api/mcp`, requires `Authorization: Bearer <TENANT_KEY>`, and resolves tenant scope from the database credential. Fixed keys can be independently revoked through the M8 terminal control plane.

The hosted adapter is stateful within one running process. Initialization returns an `MCP-Session-Id`; later requests reuse the matching transport/server pair. Sessions expire after `CMS_MCP_SESSION_IDLE_TIMEOUT_MS` (30 minutes by default), are bounded by `CMS_MCP_MAX_SESSIONS` (100 by default), and close on MCP `DELETE` or process shutdown. A restart intentionally ends active sessions, so clients reconnect and initialize again; PostgreSQL CMS data is unaffected. Run one application instance until distributed session routing is introduced.

Set `CMS_MCP_ALLOWED_ORIGINS` to a comma-separated allowlist when browser-origin MCP access is needed. The default `*` preserves current non-browser coding-agent compatibility for the PoC. Authenticated readiness and aggregate session status are available at `GET /api/mcp/health`; this endpoint never exposes session identifiers.

`CMS_MCP_API_KEY` and `CMS_TENANT_ID` remain only for the one-milestone migration path. Import them with `pnpm mcp:admin key:migrate-env --confirm`, set `CMS_MCP_LEGACY_ENV_AUTH_ENABLED=false`, and restart the process. M9 removes the legacy runtime dependency.

Each active session has an in-memory MCP protocol event store for resumability. It is intentionally separate from the durable audit event stream planned for M10.

Public delivery queries only return published articles. The stable landing page never evaluates uploaded programs. An individual `/articles/[slug]` page requests its active, versioned JavaScript artifact and mounts it with `{ article }`; missing or failed runtime modules fall back to the CMS reader. Activating a new compiled version changes the pointer read by the next request, so the running kernel is not restarted.

The CMS renders article navigation outside the uploaded program. Presentation compilation enforces the versioned baseline UX contract, while the SDK provides responsive defaults for the article root, hero, sections, grids, stacks, and images. Coding agents receive the complete design rules and responsive preflight through `cms_get_instructions` and `cms_get_presentation_sdk`.

## Runtime signals

The stdio process writes one JSON telemetry event to stderr per tool call. Events contain correlation ID, contract/tool version context, tenant/article/presentation IDs when available, duration, compilation duration, result state, artifact SHA-256, and safe error code. They do not contain credentials, Markdown, TSX source, compiled code, or stack traces.

Stdout is reserved for MCP protocol messages. Route stderr to the platform log collector and index `correlationId`, `toolName`, `articleId`, and `presentationId`.

## Deployment checks

Run migrations before starting a new kernel release, then run the quality gates documented in the repository README. Program uploads after startup require no deployment action.

The architecture check rejects framework/infrastructure imports from core layers and known model-provider SDK dependencies. The kernel is intentionally generator-agnostic: Codex, Claude Code, or another MCP-capable coding agent can own generation.

## Current reliability boundary

Activation/reset are transactional and compile failures are isolated. The CMS protects navigation and baseline article structure, but M6 does not add browser sandboxing, AST/import restrictions, quotas, role permissions, or full visual isolation inside the presentation canvas. Those remain explicit future decisions.

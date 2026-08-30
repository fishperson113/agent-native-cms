# Milestone 2 — External coding-agent integration

**Status:** Implemented and verified on 2026-08-27.

## Goal

Let external coding agents such as Codex, Claude Code, or Cursor discover how to use the hosted CMS kernel and manage Markdown articles through MCP. The kernel does not invoke an LLM provider and tenants do not configure model credentials inside the CMS.

## Architecture

```text
External coding agent
  ↓ MCP prompt + tools
Hosted CMS kernel
  ↓ application handlers
Tenant-scoped PostgreSQL persistence
```

The coding agent owns content generation. The kernel owns tenant context, IDs, validation of ordinary command inputs, persistence, and publication state.

## Implemented scope

- Copyable MCP prompt: `agent-native-cms-integration`.
- Tool: `cms_get_instructions`.
- Article tools: create, list, get by ID/slug, update content, update metadata, publish, unpublish, and delete.
- Transport-independent MCP server factory.
- Local stdio transport for coding-agent development.
- Fixed server-side tenant context through `CMS_TENANT_ID`; tool callers do not choose a tenant.
- Safe typed tool errors.
- PostgreSQL-backed MCP acceptance tests using an in-memory protocol transport.

## Explicitly removed

- Internal `CodingAgent` provider port.
- OpenAI/Claude/DeepSeek adapters inside the kernel.
- Prompt form where the CMS calls an LLM on behalf of a tenant.
- Provider API keys stored for tenant content generation.

## Terminal verification

```text
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm demo:mcp
```

To run the stdio MCP server for a real coding-agent client:

```text
pnpm mcp:stdio
```

## Exit criteria

- A client can discover the integration prompt and article tools.
- A client can upload Markdown, update it, publish it, query it, and delete it.
- Tool calls use the configured tenant and real PostgreSQL persistence.
- No model provider SDK exists in the CMS kernel.
- `src/app/` remains unchanged.

## Next milestone

Apply the same upload model to presentation programs: the coding agent submits TSX, the kernel compiles and persists an artifact, and no kernel redeploy is required.

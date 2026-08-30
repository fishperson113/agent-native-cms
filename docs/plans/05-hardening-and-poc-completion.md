# Milestone 5 — Reliability and hosted-kernel readiness

## Status

Implemented. Transaction rollback, repeated/failed upload isolation, article-owned artifact deletion, MCP/SDK contract compatibility, safe correlated telemetry, architecture enforcement, CI, and backup/recovery handoff are covered by code, tests, and operational documentation.

## Goal

Prove that article/presentation uploads and activation can operate repeatedly against a long-running kernel without deploy-time coupling or inconsistent database state.

## Work packages

### 1. Transaction and consistency tests

- Activation updates presentation state and article pointer atomically.
- Reset atomically detaches the pointer where multiple records change.
- Failed compilation never replaces the active artifact.
- Repeated uploads create independent presentation records.
- Article deletion behavior with presentation artifacts is explicit and tested.

### 2. MCP contract stability

- Version the copyable instructions, tool names, schemas, and presentation SDK contract.
- Keep tool errors structured and stable for coding agents.
- Add compatibility tests so internal refactors do not silently break clients.

### 3. Observability

- Log correlation ID, tenant/article/presentation IDs, tool name, compile duration, result state, and artifact hash.
- Never log credentials or full source in normal production logs.
- Report compile/runtime failures without exposing kernel internals.

### 4. Operational handoff

- Add CI for migrations, unit/integration tests, lint, typecheck, and build.
- Document database backup/restore and artifact recovery assumptions.
- Document how a hosted kernel receives a new program without rebuild/redeploy.
- Confirm no provider SDK or internal LLM-generation path exists.

## Current non-goals

Security restriction suites, AST allowlists, user permission policies, layout protection, browser sandbox hardening, and provider credential management are intentionally not gates for this phase.

## Exit criteria

- A long-running test kernel accepts multiple content/program uploads.
- Compile failures are isolated to their presentation record.
- Activation/reset are atomic and do not restart the kernel.
- MCP compatibility and PostgreSQL acceptance tests pass.
- The project is ready for hosted transport and browser dynamic loading.

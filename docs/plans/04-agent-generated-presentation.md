# Milestone 4 — MCP presentation lifecycle

## Status

Implemented. The PostgreSQL-backed MCP acceptance flow covers SDK discovery, successful and failed uploads, inspection, version listing, activation, rollback by reactivating an older compiled version, and reset.

## Goal

Expose the presentation program workflow to external coding agents through MCP: discover SDK → upload source → compile → inspect status → activate/reset.

## Tool contract

Implemented tools:

```text
cms_get_presentation_sdk
cms_upload_article_presentation
cms_get_article_presentation
cms_list_article_presentations
cms_activate_article_presentation
cms_reset_article_presentation
```

The MCP server supplies tenant context. The coding agent supplies article ID, source program, and optional metadata/instructions for its own reasoning.

## Work packages

### 1. SDK discovery

- Add the exact SDK/runtime context contract to the copyable MCP prompt.
- Add `cms_get_presentation_sdk` so agents can refresh the contract instead of relying on stale memory.

### 2. Upload and compile tool

- Accept TSX source from the external coding agent.
- Invoke the M3 upload/compile use case.
- Return presentation ID, compilation state, warnings, and safe errors.
- Do not activate automatically.

### 3. Atomic activation/reset

- Activate by changing presentation state and the article's active presentation pointer in a short database transaction.
- Reset by detaching the pointer; no deploy/rebuild occurs.
- Query the active compiled artifact by tenant and article.

### 4. MCP acceptance flow

```text
coding agent gets SDK
→ uploads TSX
→ kernel compiles and persists
→ coding agent activates artifact
→ active artifact query changes
→ reset removes active pointer
```

## Exit criteria

- The entire lifecycle is available through MCP and PostgreSQL-backed tests.
- Each upload is data/artifact, not a kernel source-code change.
- Activation/reset do not restart the application.
- Compilation is the only source gate in this phase.
- Browser dynamic loading remains a delivery/runtime milestone.

# Milestone 3 — Uploadable presentation program core

**Status:** Implemented and verified on 2026-08-27.

## Goal

Accept a presentation program produced by an external coding agent, compile it successfully, and persist source plus compiled artifact without rebuilding or redeploying the hosted CMS kernel.

## Current policy

Compilation success is the only program gate for this phase.

- No AST security validator yet.
- No forbidden-global or import policy yet.
- No attempt to protect the future page layout from user programs yet.
- No provider/model integration inside the kernel.
- Runtime hardening and sandbox restrictions remain future work.

## Work packages

### 1. ArticlePresentation domain

- Implement presentation identity, tenant/article ownership, source, compiled artifact, status, and timestamps.
- Use states needed by the actual upload flow: draft, compiled, failed, and active.
- Require compiled artifact before activation.
- Add tenant-scoped repository contracts and Drizzle persistence.

### 2. Presentation program contract

- Define the article runtime context passed to uploaded programs.
- Define a small `@cms/article-sdk` component contract so coding agents have a stable target.
- Publish the contract through MCP instructions/tool output.
- Treat this as an integration SDK, not as an internal model prompt.

### 3. esbuild compiler

- Implement a `PresentationCompiler` port and esbuild adapter.
- Compile uploaded TSX in memory into a browser-loadable artifact.
- Map the CMS SDK/runtime shim explicitly.
- Return structured compile errors and warnings.
- Do not compile during public rendering.

### 4. Upload application use case

- Load the target article in configured tenant context.
- Create a presentation from externally supplied source.
- Compile source outside a database transaction.
- Persist compiled or failed result.
- Never trigger a kernel build or deployment.

### 5. Terminal acceptance

- Submit a handwritten TSX fixture as if it came from a coding agent.
- Compile, persist, reload, and inspect the artifact through production ports.
- Show that a second uploaded program creates a new database artifact without changing kernel files.

## Exit criteria

- Uploaded TSX compiles and is stored with its source.
- Compile failure is persisted/returned as structured state.
- Kernel source and build output do not change when a new presentation is uploaded.
- Public/runtime dynamic loading is not implemented yet, but the artifact contract is ready for it.
- All behavior is testable from terminal.

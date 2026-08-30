# Milestone 6 — Hosted delivery and dynamic runtime

## Status

Implemented on 2026-08-28.

## Purpose

Expose the tested kernel over hosted transports and dynamically load active compiled presentation artifacts without rebuilding or redeploying the application.

## Implemented scope

- Streamable HTTP MCP endpoint using the same tool registry as stdio.
- Authentication/tenant resolution suitable for remote coding agents when requested.
- Copyable local and hosted MCP connection snippets.
- Minimal article/public delivery routes.
- Runtime endpoint/loader that fetches the active compiled artifact from persistence.
- Dynamic mounting of the program with article runtime context.
- A stable editorial landing page that lists published articles only.
- A default CMS-owned article reader with loading and runtime-failure fallback.
- Versioned browser artifacts with immutable cache headers.
- Acceptance coverage proving authenticated HTTP MCP, public/draft separation, and active artifact delivery.

## Delivery boundary

The landing page and article index are kernel-owned and never evaluate uploaded code. Only `/articles/[slug]` loads the currently active artifact. Resetting an article removes its active pointer and immediately restores the default reader. Upload and activation still require no kernel source edit, rebuild, redeploy, or restart.

## Current program policy

Compilation now includes the article experience contract in addition to TSX syntax. New programs must use ArticleRoot and Hero, pass article.title to Hero, avoid fixed horizontal sizing, and use stable viewport units. The CMS-owned article navigation sits outside remote code. AST security restrictions, import allowlists, sandbox permissions, and user capability policies remain future work.

## Entry criteria

- M1–M5 terminal suites pass.
- MCP article and presentation contracts are stable.
- Compiled artifacts and activation pointers are queryable without compilation on read.
- The user explicitly authorizes delivery/runtime work.

## Core invariant

```text
upload program
→ compile and persist
→ activate database pointer
→ runtime dynamically loads artifact
```

There is no kernel source edit, build, deploy, or planned downtime in this sequence.

# Implementation roadmap

## Revised product outcome

Run a stable hosted CMS kernel that external coding agents can program through MCP/SDK contracts. Creating a new post or presentation uploads data/program artifacts; it never edits, rebuilds, redeploys, or takes down the kernel.

```text
External coding agent
  ↓ copyable prompt / MCP tools
Hosted CMS kernel (keeps running)
  ├─ persists Markdown articles
  ├─ compiles uploaded presentation TSX
  ├─ stores immutable-ish artifacts
  └─ switches an active artifact pointer
          ↓
Runtime dynamically loads active compiled program
```

The kernel does not call OpenAI, Claude, DeepSeek, or another model provider. The user's coding agent is the generator.

## Current implementation policy

- Core-first and terminal-testable; keep `src/app/` unchanged until delivery work is requested.
- MCP is a machine-facing delivery adapter over application use cases.
- The MCP server supplies configured tenant context; tools do not accept arbitrary tenant IDs.
- Compilation includes syntax plus the baseline article experience contract.
- Keep CMS-owned article navigation outside uploaded code. Defer AST restrictions, import allowlists, sandbox policy, full visual isolation, and user permission rules.
- Do not compile programs during page requests.
- Uploaded programs are artifacts/data, never kernel source-code patches.

## Milestone dependency map

```text
M1 CMS core ✅
  tenant + article domain/use cases/PostgreSQL
          │
          ▼
M2 External agent integration ✅
  copyable prompt + MCP article tools
          │
          ▼
M3 Presentation program core ✅
  domain + SDK contract + esbuild + artifact persistence
          │
          ▼
M4 MCP presentation lifecycle ✅
  discover SDK → upload → compile → activate/reset
          │
          ▼
M5 Reliability and hosted-kernel readiness ✅
  transactions + artifact consistency + CI + observability
          │
          ▼
M6 Hosted delivery/runtime integration ✅
  remote MCP transport + dynamic browser loader + minimal UI
          │
          ▼
M7 Stateful MCP runtime ✅
  long-lived HTTP sessions + lifecycle management
          │
          ▼
M8 Admin and tenant credentials ✅
  fixed revocable keys + terminal-first control plane
          │
          ▼
M9 Authorization enforcement ✅
  REST-only operator UI + tenant-only MCP + live session control
          │
          ▼
M10 Durable audit event stream ✅
  append-only PostgreSQL log + replayable SSE feed
```

## Repository shape

```text
src/
├── app/                                  # publication, operator UI, and REST routes
├── integrations/
│   ├── admin/                            # human operator session/control plane
│   └── mcp/                              # tenant-agent prompt/tools/transports
├── modules/
│   ├── tenant/{domain,application,infrastructure}/
│   ├── content/{domain,application,infrastructure}/
│   ├── presentation/{domain,application,infrastructure}/
│   └── runtime/{domain,application,infrastructure}/
├── shared/kernel/
└── infrastructure/
    ├── config/
    └── database/
```

There is intentionally no internal `agent` module or model-provider adapter in the kernel.

## Cross-cutting contracts

| Contract | Current decision |
|---|---|
| Coding-agent onboarding | MCP prompt plus `cms_get_instructions`; later surfaced as a Copy Instructions action |
| Local agent connection | MCP stdio transport |
| Hosted agent connection | Stateful Streamable HTTP MCP transport from M7 |
| Tenant context | Resolved from a tenant credential from M8 onward; never accepted from tenant tool input |
| Article input | External agent uploads title/slug/Markdown through tools |
| Presentation input | External agent uploads TSX source through tools |
| Program gate | esbuild compilation success only |
| Artifact storage | Source and compiled code in PostgreSQL for the PoC |
| Activation | Atomic database pointer/state change; no deployment |
| Runtime | Dynamically load the active compiled artifact; implemented in M6 |

## Quality gates

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
```

Each milestone also needs a verbose terminal demo that exercises the real PostgreSQL-backed flow.

## Next implementation sequence

- [M7 — Stateful MCP runtime](./07-stateful-mcp-runtime.md)
- [M8 — Admin and tenant credential management](./08-admin-tenant-credentials.md)
- [M9 — Authorization enforcement](./09-authorization-enforcement.md) ✅
- [M10 — Durable audit event stream](./10-audit-event-stream.md)

## Deferred

- Full content editor and analytics dashboard.
- AST/security validation, import restrictions, sandbox hardening, layout isolation, fine-grained user roles, and resource quotas.
- Generic plugin marketplace, version registry, arbitrary dependency registry, microservices, Kafka, Redis, Kubernetes, and WASM.

## Execution rule

Complete M3–M5 through terminal tests, then pause before M6 unless delivery/runtime work is explicitly requested. New article or presentation workflows must never require a kernel source change or redeploy.

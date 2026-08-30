# Cordis and Agent-Native CMS

Cordis is best read as a runtime composition model, not a new syntax or a
replacement for object-oriented or functional programming. DeepSeek Harness
uses it to compose services, typed events, and reversible effects inside a
shared context.

## 1. Cordis in five visual primitives

```mermaid
flowchart TB
  Plugin["Plugin<br>contributes behavior"] --> Context["Context<br>repository of services"]
  Dependency["Declared injection<br>wait for required services"] --> Context
  Context --> Service["Stable service key<br>replace concrete provider"]
  Service --> Events["Typed events<br>observe, wrap, order, or bail"]
  Events --> Effects["Reversible effects<br>registration owns disposal"]
  Effects --> Scope["Scope<br>capability exists only where needed"]
  Scope --> Plugin
```

DeepSeek Harness goes further: its model adapter, tools, session log, agent
loop, UI integrations, and policies are plugins assembled from profiles,
bundles, and configuration overlays.

## 2. Spatiotemporal composability

The Cordis paper frames composition across both space and time.

```mermaid
flowchart LR
  subgraph Space["Space: where behavior applies"]
    Global["Global context"] --> TenantScope["Scoped context"]
    TenantScope --> AgentScope["Agent or task context"]
  end

  subgraph Time["Time: when behavior applies"]
    Absent["Capability absent"] --> Mounted["Mount provider"]
    Mounted --> Active["Effects active"]
    Active --> Unmount["Dispose in reverse ownership order"]
    Unmount --> Absent
  end

  AgentScope -.-> Mounted
```

The important move is that a dependency is not only “which implementation?” It
can also be “in which scope?” and “during which lifecycle interval?”

## 3. Cordis inside a client-server product

Cordis itself is primarily an in-process composition mechanism. A client-server
system can use it to assemble protocol adapters and application capabilities,
but the network boundary still requires an explicit protocol.

```mermaid
flowchart LR
  ClientA["Web client"] -->|"HTTP / WebSocket"| WebAdapter["Web adapter plugin"]
  ClientB["SDK client"] -->|"JSON-RPC"| SDKAdapter["SDK adapter plugin"]
  ClientC["Coding agent"] -->|"MCP"| MCPAdapter["MCP adapter plugin"]

  subgraph Host["Cordis-composed server process"]
    WebAdapter --> Agents["Agent capability"]
    SDKAdapter --> Agents
    MCPAdapter --> Tools["Tool capability"]
    Agents --> Sessions["Durable session capability"]
    Agents --> Models["Model provider capability"]
    Tools --> Policy["Policy events"]
  end

  Sessions --> Database[("Persistent log")]
  Models --> Provider["External model provider"]
```

This is how the philosophy reaches client-server architecture: transports are
adapters around a composable runtime, not replacements for networking,
authentication, consistency, or durable storage.

## 4. Current Agent-Native CMS architecture

```mermaid
flowchart TB
  Agent["Coding agent"] -->|"MCP + tenant key"| MCP["Stateful MCP boundary"]
  Operator["Operator"] -->|"Admin REST UI"| Admin["Admin boundary"]

  subgraph Kernel["Stable privileged CMS kernel"]
    Auth["Authentication and ownership"]
    Content["Article application handlers"]
    Presentation["Presentation lifecycle handlers"]
    Compiler["TSX compiler"]
    Audit["Durable audit event stream"]
    Delivery["Public delivery"]
  end

  MCP --> Auth
  Admin --> Auth
  Auth --> Content
  Auth --> Presentation
  Presentation --> Compiler
  Content --> DB[("PostgreSQL")]
  Presentation --> DB
  Content --> Audit
  Presentation --> Audit
  Delivery --> DB

  Delivery --> Landing["CMS-owned global landing page"]
  Delivery --> Reader["Article reader shell"]
  Reader --> Default["Default presentation"]
  Reader --> Custom["Active compiled presentation"]
```

The current codebase already uses dependency inversion around repositories,
the presentation compiler, lifecycle transactions, and audit sinks. It does
not use Cordis, and it does not need a general plugin framework to validate the
core experiment.

## 5. What should be borrowed

```mermaid
flowchart LR
  Cordis["Cordis / Harness idea"] --> KeepA["Stable capability definitions"]
  Cordis --> KeepB["Provider behind composition root"]
  Cordis --> KeepC["Typed lifecycle and policy events"]
  Cordis --> KeepD["Every registration owns cleanup"]
  Cordis --> KeepE["Durable facts separate from live interception"]

  KeepA --> CMS["Future CMS runtime"]
  KeepB --> CMS
  KeepC --> CMS
  KeepD --> CMS
  KeepE --> CMS
```

| Borrow | CMS interpretation |
| --- | --- |
| Capability seam | Compiler, runtime, media, policy, or storage contract |
| Service provider | Operator-installed trusted implementation |
| Typed event | Ordered validation, policy, observability, and lifecycle stage |
| Reversible effect | Mount/dispose browser runtime resources deterministically |
| Durable event | Explain publication changes from append-only safe metadata |
| Scope | Apply an artifact and its capabilities to one article experience |

## 6. What should not be copied

```mermaid
flowchart TB
  Candidate["Everything is a plugin"] --> Decision{"Does replacement weaken a kernel invariant?"}
  Decision -->|"yes"| Kernel["Keep privileged and non-replaceable"]
  Decision -->|"no"| Trust{"Who provides the code?"}
  Trust -->|"operator"| Provider["Trusted provider seam"]
  Trust -->|"tenant"| Artifact["Untrusted isolated artifact"]

  Kernel --> Invariants["auth, ownership, transactions, audit safety, routing"]
  Provider --> Examples["compiler, media, runtime adapter, exporter"]
  Artifact --> Sandbox["iframe or worker plus explicit capabilities"]
```

DeepSeek Harness intentionally has no privileged core to patch. Agent-Native
CMS needs the opposite security guarantee at its center: tenants must never
replace authentication, persistence rules, audit enforcement, or activation
transactions.

## 7. Current and future presentation pipelines

### Current TSX path

```mermaid
flowchart LR
  Prompt["Agent reads SDK and UX rules"] --> TSX["Generate TSX component"]
  TSX --> Upload["Upload over MCP"]
  Upload --> Compile["Compile with esbuild"]
  Compile --> Version["Store immutable version and hash"]
  Version --> Activate["Activate transactionally"]
  Activate --> Import["Article browser imports artifact"]
  Import --> Mount["React mounts presentation"]
```

### Language-neutral direction

```mermaid
flowchart LR
  Source["TSX, web bundle, or future language"] --> Manifest["Versioned manifest<br>format, runtime, requested capabilities"]
  Manifest --> Policy["Resolve policy and granted capabilities"]
  Policy --> Registry["Select trusted compiler provider"]
  Registry --> Artifact["Immutable runtime artifact"]
  Artifact --> Runtime["Select isolated runtime provider"]
  Runtime --> Article["Article-scoped experience"]
  Runtime --> Dispose["Deterministic disposal and fallback"]
```

TSX is a productive authoring format today because it supplies a typed
component contract, composable primitives, static validation, and a predictable
React lifecycle. The durable architectural boundary should nevertheless be the
manifest, capabilities, artifact, and lifecycle—not the source language.

## 8. Lifecycle sequence with durable and live events

```mermaid
sequenceDiagram
  autonumber
  actor Agent as Coding agent
  participant Boundary as MCP boundary
  participant Policy as Live policy pipeline
  participant Compiler as Compiler provider
  participant Store as Artifact store
  participant Audit as Durable audit stream
  participant Browser as Article runtime

  Agent->>Boundary: Upload source and manifest
  Boundary->>Policy: Authenticate, authorize, validate
  alt denied
    Policy-->>Boundary: Final denial
    Boundary->>Audit: Append safe denial outcome
    Boundary-->>Agent: Rejected
  else allowed
    Policy-->>Boundary: Resolved capabilities
    Boundary->>Compiler: Compile
    Compiler-->>Boundary: Artifact or diagnostics
    Boundary->>Store: Persist immutable version
    Boundary->>Audit: Append compile outcome
    Boundary-->>Agent: Version remains inactive
  end

  Agent->>Boundary: Activate version
  Boundary->>Store: Atomic active-version switch
  Store-->>Boundary: Previous and current IDs
  Boundary->>Audit: Append presentation.activated
  Boundary-->>Agent: Activated
  Browser->>Store: Load active artifact
  Browser->>Browser: Mount within article scope
  Browser->>Browser: Dispose on navigation or replacement
```

Live events answer “may this action proceed now?” Durable events answer “what
changed public behavior, who caused it, and can we reconstruct the decision?”

## 9. Architectural destination

```mermaid
flowchart TB
  Stable["Stable privileged kernel"] --> Auth["Identity and ownership"]
  Stable --> Transactions["Publication transactions"]
  Stable --> Audit["Safe durable events"]
  Stable --> Fallback["Routing and default reader"]

  Seams["Trusted provider seams"] --> Compiler["Compiler providers"]
  Seams --> Runtime["Runtime providers"]
  Seams --> Media["Media providers"]
  Seams --> Observability["Observability exporters"]

  Artifacts["Untrusted presentation artifacts"] --> Manifest["Requested capabilities"]
  Manifest --> Policy["Kernel resolves grants"]
  Policy --> Isolation["Sandboxed article runtime"]

  Stable --> Seams
  Stable --> Policy
  Runtime --> Isolation
  Isolation --> Fallback
```

The synthesis is:

> Stable kernel, pluggable trusted capabilities, untrusted presentation
> artifacts, reversible article-scoped effects.

## References

- [DeepSeek Harness architecture](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md)
- [DeepSeek Harness Cordis primer](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cordis-primer.md)
- [DeepSeek Harness capability seams](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/capability-seams.md)
- [A Programming Paradigm for Spatiotemporal Composability](https://arxiv.org/abs/2608.25512)
- [Capability-oriented presentation runtime proposal](../../future/capability-oriented-presentation-runtime.md)
- [Future architecture diagrams](../../future/architecture-diagrams.md)


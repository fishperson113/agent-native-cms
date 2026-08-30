# Future architecture diagrams

These diagrams accompany the
[capability-oriented presentation runtime proposal](capability-oriented-presentation-runtime.md).
They use Mermaid fenced blocks so GitHub renders them directly while keeping
the source reviewable in version control.

The diagrams describe a possible future direction. They are not a statement
that every component or contract shown here already exists.

## 1. Cordis philosophy at a glance

This component diagram summarizes the ideas worth learning from Cordis and
DeepSeek Harness: composition through a shared context, dependencies by stable
service keys, typed events for interception, and reversible registrations.

```mermaid
flowchart TB
  Profile["Profile and ordered bundle layers"] --> Tree["Plugin tree composed at boot"]
  Overlay["Operator configuration overlays"] --> Tree

  subgraph Cordis["Cordis shared context"]
    Context["Context service registry"]
    Events["Typed event dispatcher"]
    Effects["Reversible effect registry"]
  end

  Tree --> PluginA["Service provider plugin"]
  Tree --> PluginB["Consumer plugin"]
  Tree --> PluginC["Policy or observer plugin"]

  PluginA -->|"register service by stable key"| Context
  PluginB -->|"inject required service key"| Context
  PluginC -->|"listen, wrap, deny, or observe"| Events
  PluginA -->|"publish typed lifecycle events"| Events

  PluginA -->|"register disposer"| Effects
  PluginB -->|"register disposer"| Effects
  PluginC -->|"register disposer"| Effects
  Effects -->|"unload or reload"| Dispose["Reverse registrations in safe order"]

  Context --> Result["Replaceable capabilities"]
  Events --> Result
  Dispose --> Result

  classDef composition fill:#e8eef8,stroke:#3b5b92,color:#17233d
  classDef core fill:#fff4d6,stroke:#9c6b15,color:#3a2a0a
  classDef plugin fill:#e8f6ed,stroke:#34734b,color:#153923
  classDef outcome fill:#f3e8ff,stroke:#7447a3,color:#301d45
  class Profile,Overlay,Tree composition
  class Context,Events,Effects core
  class PluginA,PluginB,PluginC plugin
  class Dispose,Result outcome
```

The key lesson is not that every class must become a plugin. The useful lesson
is that extensions depend on stable capability definitions, attach only at
documented seams, and own cleanup for every effect they register.

## 2. Selective application in Agent-Native CMS

The CMS keeps security and data invariants inside a privileged kernel. Trusted
providers are installed by the operator, while tenant-submitted presentation
programs remain untrusted immutable artifacts.

```mermaid
flowchart LR
  Agent["Coding agent"] -->|"Bearer tenant key and MCP"| Mcp["Stateful MCP boundary"]
  Admin["Operator admin UI"] -->|"REST-only admin session"| AdminApi["Admin boundary"]

  subgraph Kernel["Privileged CMS kernel"]
    Auth["Authentication and tenant ownership"]
    ToolPipeline["Typed MCP policy pipeline"]
    Handlers["Article and presentation handlers"]
    Lifecycle["Transactional artifact lifecycle"]
    Audit["Safe durable audit stream"]
    PublicDelivery["Public article delivery"]
  end

  Mcp --> Auth
  AdminApi --> Auth
  Auth --> ToolPipeline
  ToolPipeline --> Handlers
  Handlers --> Lifecycle
  Handlers --> Audit
  Lifecycle --> Audit

  subgraph Providers["Trusted operator-installed capability providers"]
    CompilerRegistry["Compiler provider registry"]
    RuntimeRegistry["Runtime provider registry"]
    PolicyRegistry["Presentation policy registry"]
    MediaProvider["Approved media provider"]
  end

  Lifecycle --> CompilerRegistry
  Lifecycle --> PolicyRegistry
  PublicDelivery --> RuntimeRegistry
  PublicDelivery --> MediaProvider

  subgraph Persistence["PostgreSQL source of record"]
    Articles[("Articles and tenants")]
    Artifacts[("Immutable presentation artifacts")]
    Events[("Audit events")]
  end

  Handlers --> Articles
  Lifecycle --> Artifacts
  Audit --> Events
  PublicDelivery --> Articles
  PublicDelivery --> Artifacts

  subgraph Browser["Browser trust boundary"]
    Landing["CMS-owned landing page"]
    Reader["Article reader shell"]
    Sandbox["Capability-scoped presentation runtime"]
    Fallback["Default article reader"]
  end

  PublicDelivery --> Landing
  PublicDelivery --> Reader
  RuntimeRegistry --> Sandbox
  Reader --> Sandbox
  Reader --> Fallback
  Artifacts -.->|"verified artifact only"| Sandbox

  classDef privileged fill:#fff0e6,stroke:#a34f16,color:#402009
  classDef trusted fill:#e8f1ff,stroke:#3569a8,color:#152d4d
  classDef untrusted fill:#fff4cc,stroke:#9b7611,color:#3d2f05,stroke-dasharray:5 5
  classDef storage fill:#e9f7ef,stroke:#348457,color:#143a27
  class Auth,ToolPipeline,Handlers,Lifecycle,Audit,PublicDelivery privileged
  class CompilerRegistry,RuntimeRegistry,PolicyRegistry,MediaProvider trusted
  class Sandbox untrusted
  class Articles,Artifacts,Events storage
```

The provider registry is not tenant-extensible server code. Tenants may request
an allowed `format`, `runtime`, and capability set in a manifest; only the
kernel can resolve those requests to trusted providers.

## 3. Upload, compile, and activate a presentation

This sequence preserves the current rule that uploading never activates a
presentation implicitly. Compilation produces an immutable version, and a
separate activation transaction changes public behavior.

```mermaid
sequenceDiagram
  autonumber
  actor Agent as Coding agent
  participant MCP as MCP boundary
  participant Auth as Tenant auth
  participant Policy as Policy pipeline
  participant Registry as Compiler registry
  participant Compiler as Format compiler
  participant Store as PostgreSQL
  participant Audit as Audit stream

  Agent->>MCP: Upload source and presentation manifest
  MCP->>Auth: Authenticate bearer credential
  Auth-->>MCP: Tenant identity and credential identity
  MCP->>Policy: Validate format, contract, size, and capabilities

  alt Request denied
    Policy-->>MCP: Final denial with safe reason
    MCP->>Audit: Append presentation.upload_denied
    MCP-->>Agent: Denied without compiling
  else Request allowed
    Policy-->>MCP: Resolved capability set
    MCP->>Registry: Resolve trusted compiler by format
    Registry-->>MCP: Compiler provider
    MCP->>Compiler: Compile source with resolved contract

    alt Compilation failed
      Compiler-->>MCP: Structured compile errors
      MCP->>Store: Save failed immutable version
      MCP->>Audit: Append presentation.compile_failed
      MCP-->>Agent: Failed version and diagnostics
    else Compilation succeeded
      Compiler-->>MCP: Artifact, manifest, and integrity hash
      MCP->>Store: Save compiled immutable version
      MCP->>Audit: Append presentation.compile_succeeded
      MCP-->>Agent: Compiled version, not active
    end
  end

  Agent->>MCP: Activate compiled presentation version
  MCP->>Auth: Recheck tenant ownership
  MCP->>Policy: Validate activation compatibility

  alt Activation rejected
    Policy-->>MCP: Denial or incompatible contract
    MCP->>Audit: Append presentation.activation_denied
    MCP-->>Agent: Previous active version preserved
  else Activation allowed
    Policy-->>MCP: Activation permitted
    MCP->>Store: Atomically switch active presentation ID
    Store-->>MCP: Previous and new active IDs
    MCP->>Audit: Append presentation.activated
    MCP-->>Agent: Activated version and article state
  end
```

## 4. Public runtime, fallback, and reversible cleanup

The browser runtime must fail locally to one article. A broken artifact must not
break the CMS landing page, routing, or other articles.

```mermaid
sequenceDiagram
  autonumber
  actor Reader as Site visitor
  participant Route as Article route
  participant Delivery as Public delivery
  participant Store as Artifact store
  participant Registry as Runtime registry
  participant Shell as CMS reader shell
  participant Runtime as Presentation runtime
  participant Fallback as Default reader

  Reader->>Route: GET article by UUID and slug
  Route->>Delivery: Load published article and active artifact
  Delivery->>Store: Read immutable active version
  Store-->>Delivery: Article, manifest, artifact, and integrity

  alt No active custom presentation
    Delivery-->>Shell: Article with no artifact
    Shell->>Fallback: Render CMS default reader
    Fallback-->>Reader: Stable article experience
  else Active artifact exists
    Delivery->>Delivery: Verify integrity and contract version
    Delivery->>Registry: Resolve trusted runtime provider

    alt Artifact or provider rejected
      Registry-->>Shell: Unsupported or invalid runtime
      Shell->>Fallback: Render CMS default reader
      Fallback-->>Reader: Stable article experience
    else Runtime accepted
      Registry-->>Shell: Runtime provider
      Shell->>Runtime: Mount with capability-scoped article context

      alt Runtime mounts successfully
        Runtime-->>Reader: Custom article presentation
      else Runtime throws or times out
        Runtime-->>Shell: Contained failure
        Shell->>Runtime: Dispose listeners, frame, worker, and object URLs
        Shell->>Fallback: Render CMS default reader
        Fallback-->>Reader: Recovered article experience
      end
    end
  end

  opt Navigation, rollback, reset, or version replacement
    Shell->>Runtime: Dispose previous runtime deterministically
    Runtime-->>Shell: Cleanup complete
  end
```

## 5. Presentation artifact state model

This state diagram makes reversibility explicit. A failed upload is retained for
diagnostics but can never become active. Rollback activates an older compatible
compiled version rather than mutating an artifact in place.

```mermaid
stateDiagram-v2
  state "Uploaded" as Uploaded
  state "Compiling" as Compiling
  state "Compiled" as Compiled
  state "Compilation failed" as Failed
  state "Active" as Active
  state "Superseded by another version" as Superseded
  state "Reset to default reader" as Reset
  state "Deleted" as Deleted
  [*] --> Uploaded
  Uploaded --> Compiling : validate and compile
  Compiling --> Compiled : compilation succeeded
  Compiling --> Failed : compilation failed
  Compiled --> Active : activate transactionally
  Active --> Superseded : activate another version
  Superseded --> Active : rollback to this version
  Active --> Reset : reset to default reader
  Reset --> Active : reactivate compatible version
  Compiled --> Deleted : article deleted
  Failed --> Deleted : article deleted
  Superseded --> Deleted : article deleted
  Active --> Deleted : article deleted
  Reset --> Deleted : article deleted
  Failed --> [*]
  Deleted --> [*]
```

The database record remains immutable after compilation. Terms such as
`Active`, `Superseded`, and `Reset` describe the article's selection relationship
to artifact versions, not source-code mutation.

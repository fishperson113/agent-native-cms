# Linking, components, and plugins

Libraries, plugins, and remote services all enable reuse, but they cross
different boundaries and fail in different ways.

## 1. One capability, four binding times

```mermaid
flowchart LR
  Capability["Need: render media"] --> Source["Source-time<br>import concrete module"]
  Capability --> Link["Link-time<br>resolve library symbol"]
  Capability --> Runtime["Runtime<br>load plugin provider"]
  Capability --> Network["Request-time<br>call remote service"]

  Source --> SameBuild["same build graph"]
  Link --> SameProcess["same process and ABI"]
  Runtime --> HostLifecycle["host contract and lifecycle"]
  Network --> Protocol["protocol, latency, partial failure"]
```

The later a binding decision occurs, the more replaceability becomes possible;
the host also assumes more validation, lifecycle, and failure-handling work.

## 2. Static library, shared library, plugin, and service

| Mechanism | Bound when | Executes where | Compatibility boundary | Failure blast radius |
| --- | --- | --- | --- | --- |
| Static library | Link time | Same process | Object format + linker contract | Process |
| DLL / shared object | Load time | Same process | ABI + exported symbols | Process |
| Managed plugin | Runtime | Usually same process | Host API + language/runtime version | Often process |
| Worker / subprocess | Runtime | Isolated execution context | Message protocol | Worker/process |
| Remote service | Request time | Another process or host | Network protocol | Partial/network failure |
| CMS presentation | Article-view runtime | Visitor browser | Artifact + SDK contract | One article reader |

## 3. Dynamic linking versus plugin loading

```mermaid
flowchart TB
  subgraph DynamicLinking["Dynamic linking"]
    Executable["Executable imports symbol"] --> Loader["OS dynamic linker"]
    SharedLib["Shared library exports symbol"] --> Loader
    Loader --> Address["Resolved function or data address"]
  end

  subgraph PluginLoading["Plugin loading"]
    Host["Host discovers candidate"] --> Manifest["Validate manifest and version"]
    Manifest --> Load["Load module or isolated process"]
    Load --> Entry["Call documented entry point"]
    Entry --> Register["Register capabilities and effects"]
    Register --> Dispose["Unload through deterministic cleanup"]
  end
```

A DLL can be used to implement a plugin, but a DLL alone does not define
discovery, policy, ownership, registration, or cleanup. Those are host-level
contracts.

## 4. The plugin host lifecycle

```mermaid
stateDiagram-v2
  [*] --> Discovered
  Discovered --> Rejected : incompatible or forbidden
  Discovered --> Loaded : validate and load
  Loaded --> Active : register capabilities
  Active --> Quiescing : replace, reload, or stop
  Quiescing --> Disposed : unwind owned effects
  Disposed --> [*]
  Rejected --> [*]
  Loaded --> Failed : initialization error
  Active --> Failed : runtime fault
  Failed --> Disposed : best-effort cleanup
```

Without an ownership rule for effects, unloading is unsafe. Event listeners,
timers, file handles, routes, workers, and cached references can outlive the
plugin that created them.

## 5. Capability seams

```mermaid
flowchart LR
  Definition["Service definition<br>stable interface and key"] --> Consumer["Consumer<br>depends only on definition"]
  ProviderA["Local provider"] --> Definition
  ProviderB["Sandbox provider"] --> Definition
  ProviderC["Remote provider"] --> Definition
  Policy["Policy and observability"] -.-> Definition

  classDef contract fill:#fff7ed,stroke:#ea580c,color:#431407
  classDef provider fill:#f0fdf4,stroke:#16a34a,color:#14532d
  classDef consumer fill:#eff6ff,stroke:#2563eb,color:#1e3a8a
  class Definition contract
  class ProviderA,ProviderB,ProviderC provider
  class Consumer consumer
```

A useful seam needs all three roles: definition, provider, and consumer. Merely
wrapping a class in an interface does not prove replaceability; at least two
meaningfully different providers should pass the same lifecycle contract.

## 6. Isolation choices

```mermaid
flowchart TB
  Trusted{"How trusted is extension code?"}
  Trusted -->|"same operator and release"| InProcess["In-process module<br>fast, broad authority"]
  Trusted -->|"trusted but failure-prone"| Worker["Worker or subprocess<br>message boundary"]
  Trusted -->|"tenant-submitted browser code"| Iframe["Sandboxed iframe<br>CSP and capability messages"]
  Trusted -->|"independent organization"| Remote["Remote service<br>authenticated protocol"]

  InProcess --> Cleanup["Lifecycle cleanup still required"]
  Worker --> Limits["CPU, memory, timeout, termination"]
  Iframe --> Limits
  Remote --> Network["retry, idempotency, observability"]
```

## 7. Traditional plugin versus CMS presentation

```mermaid
flowchart LR
  subgraph Traditional["Traditional server plugin"]
    Package["Plugin package"] --> Server["Load into host process"]
    Server --> Internal["Access host APIs and resources"]
  end

  subgraph CMS["Agent-Native CMS presentation"]
    TSX["Tenant TSX"] --> Compile["Server compiles immutable artifact"]
    Compile --> Store[("Artifact store")]
    Store --> Browser["Browser article route"]
    Browser --> SDK["Narrow article SDK contract"]
  end

  Internal -.-> RiskA["kernel-wide privilege and failure"]
  SDK -.-> RiskB["article-scoped presentation effect"]
```

This distinction is central to the project. Dynamic loading is a mechanism;
the architecture is defined by where code executes, which authority it gets,
and how its effects are contained and reversed.

## References

- [System V ABI: ELF dynamic linking](https://refspecs.linuxfoundation.org/elf/gabi4%2B/ch5.dynamic.html)
- [Microsoft: Dynamic-link library search order](https://learn.microsoft.com/en-us/windows/win32/dlls/dynamic-link-library-search-order)
- [DeepSeek Harness: capability seams](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/capability-seams.md)


# Future direction: capability-oriented presentation runtime

Status: exploratory architecture proposal. This document describes a possible
direction, not a committed compatibility contract or implementation schedule.

## Context

Agent-Native CMS currently accepts an article presentation as TSX, compiles it
with esbuild, stores the immutable artifact, and dynamically loads the active
version on the matching article page. This already gives the presentation a
plugin-like lifecycle without allowing it to change or redeploy the hosted CMS
kernel.

TSX is a productive first authoring format, but it should not become an
accidental permanent boundary. The durable system boundary should be a
versioned presentation artifact contract that can support more than one source
language and runtime.

This proposal is inspired by the capability seams, typed events, and reversible
effects described by [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
and its [architecture documentation](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md).
It intentionally adapts those ideas rather than adopting its "everything is a
plugin" architecture wholesale.

## Design position

The target philosophy is:

> Stable kernel, pluggable capabilities, untrusted presentation artifacts.

The kernel remains privileged and deliberately small. Extensibility belongs at
documented capability seams around the kernel, while tenant-submitted programs
remain isolated artifacts with no access to kernel internals.

This is different from a general server plugin system. Operator-installed code
and tenant-uploaded presentation code have different trust models and must not
share the same execution privileges.

## What remains in the privileged kernel

The following invariants must not be replaceable by an uploaded presentation or
tenant-controlled provider:

- tenant identity, credential verification, and ownership isolation;
- article publication state and persistence rules;
- presentation versioning, integrity, and activation transactions;
- audit metadata safety and durable operator visibility;
- resource limits and capability enforcement;
- public routing and the CMS-owned landing experience;
- rollback and default-reader recovery behavior.

These responsibilities define the stable CMS kernel. Making them dynamically
replaceable would weaken the main guarantee of the project: publishing content
or changing an article experience cannot take down or mutate the hosted kernel.

## What may become a capability provider

The following edges are suitable for explicit provider interfaces:

- presentation source compilers;
- browser runtime adapters;
- presentation validation policies;
- media and asset resolution;
- artifact storage backends;
- delivery and cache adapters;
- observability exporters;
- optional MCP tool extensions installed by the operator.

A capability should have three named roles:

1. A definition that owns the stable interface and contract version.
2. A provider that implements the capability.
3. A consumer that depends only on the definition, never the concrete provider.

Providers are assembled by the kernel composition root. Tenant code selects
from allowed providers through a manifest; it cannot register arbitrary
server-side implementations.

## Presentation artifact contract

A future presentation upload should include a manifest independent of its
source language:

```ts
type PresentationFormat = "tsx" | "web-bundle" | "wasm";

type PresentationCapability =
  | "article.read"
  | "navigation.home"
  | "media.render"
  | "links.external";

type PresentationManifest = {
  contractVersion: "1.0";
  format: PresentationFormat;
  runtime: "react" | "sandboxed-iframe" | "wasm";
  entrypoint: string;
  capabilities: PresentationCapability[];
  integrity?: string;
};
```

The manifest does not grant capabilities by itself. It requests them. Kernel
policy resolves the requested set against the contract version, provider,
tenant policy, and deployment policy before compilation or activation.

The compiled artifact records the resolved capabilities and a kernel-generated
integrity hash. Activation always references an immutable artifact version.

## Compiler and runtime seams

The current esbuild implementation can become the first provider behind a
format-neutral interface:

```ts
interface PresentationCompilerProvider {
  readonly format: PresentationFormat;

  compile(
    source: PresentationSource,
    context: PresentationCompilationContext,
  ): Promise<CompiledPresentationArtifact>;
}

interface PresentationRuntimeProvider {
  readonly runtime: PresentationManifest["runtime"];

  supports(artifact: CompiledPresentationArtifact): boolean;
}
```

The initial provider mapping would be:

```text
tsx
  compiler: EsbuildPresentationCompiler
  runtime: ReactArticleRuntime
```

A second provider could validate that the abstraction is real:

```text
web-bundle
  compiler: StaticWebBundleCompiler
  runtime: SandboxedIframeRuntime
```

Only after two formats work through the same lifecycle should the interfaces be
generalized further. Until then, avoid a generic plugin framework.

## Capability and policy pipeline

Cross-cutting policy should be attached to typed lifecycle stages rather than
duplicated in MCP tool handlers, compilers, and delivery routes.

The presentation pipeline should be explicit:

```text
receive source and manifest
  -> authenticate and resolve tenant
  -> resolve format provider
  -> validate manifest and requested capabilities
  -> apply source and resource policies
  -> compile
  -> persist immutable artifact and integrity hash
  -> activate transactionally when requested
  -> append a safe audit event
```

The MCP execution pipeline should similarly expose stable stages:

```text
authenticate
  -> authorize
  -> validate input
  -> execute application handler
  -> normalize result
  -> audit and measure
  -> return MCP response
```

Possible policies include tenant rate limits, source-size limits, artifact-size
limits, allowed capabilities, compile deadlines, media restrictions, and
approval requirements. A policy may deny or narrow a capability request, but a
later policy must not be able to undo a final security denial.

## Reversible lifecycle

DeepSeek Harness treats registrations as effects that can be unwound. The CMS
equivalent is an artifact lifecycle whose externally visible effects are
reversible without modifying kernel code:

- upload creates a new immutable version but does not activate it;
- activate atomically replaces the active version;
- rollback activates an older compatible version;
- reset removes the custom active selection and restores the default reader;
- runtime disposal removes listeners, frames, workers, object URLs, and other
  browser resources owned by the previous artifact.

Every runtime provider must define cleanup semantics. Activation is not complete
if the previous runtime cannot be disposed safely.

## Durable events and auditability

The current PostgreSQL audit stream should remain an operational record rather
than becoming full event sourcing. However, every action that changes public
behavior should be reconstructable from safe durable events.

Candidate events include:

```text
article.created
article.content_updated
article.published
article.unpublished
presentation.uploaded
presentation.compile_succeeded
presentation.compile_failed
presentation.activated
presentation.reset
article.deleted
```

Events should identify the actor, tenant, article, presentation version,
correlation ID, outcome, contract version, format, runtime, and artifact hash
where applicable. They must never contain credentials, authorization headers,
Markdown bodies, TSX source, compiled code, or arbitrary request payloads.

The design principle is:

> Anything that changes the public publication must be explainable from the
> durable event history.

## Isolation model

Presentation artifacts are tenant-submitted and must be treated as untrusted.
They must not mount as Node.js plugins beside authentication, persistence, or
MCP services.

The preferred non-React runtime is a sandboxed iframe or worker with:

- a strict Content Security Policy;
- an explicit message protocol;
- capability-scoped article data;
- no ambient access to the CMS DOM or credentials;
- CPU, memory, payload, and execution-time budgets where the platform permits;
- controlled external links and approved media sources;
- deterministic teardown on navigation, reset, rollback, or runtime failure.

WebAssembly may become another source target, but it does not remove the need
for capability enforcement or browser isolation.

## Alignment with the current codebase

The proposal extends existing boundaries instead of replacing them:

- `PresentationCompiler` becomes or feeds the compiler-provider seam.
- `ArticlePresentationRepository` continues to own immutable versions.
- `PresentationLifecycleUnitOfWork` remains the transactional activation/reset
  boundary.
- `article-presentation-sdk-contract` remains the versioned TSX contract.
- `article-experience-design-rules` can become the first presentation policy.
- `AuditEventSink` remains the safe durable event output.
- `create-cms-mcp-kernel` remains the composition root for trusted providers.
- the stateful MCP session manager remains transport infrastructure, separate
  from presentation execution.

No existing domain handler should import a compiler, React runtime, iframe
adapter, or concrete storage provider directly.

## Non-goals

This direction does not propose:

- loading arbitrary npm packages into the hosted kernel;
- allowing tenants to replace authentication, repositories, transactions, or
  audit enforcement;
- turning every domain service into a runtime plugin;
- adopting Cordis or copying DeepSeek Harness internals;
- switching the CMS to event sourcing;
- supporting multiple formats before the isolation and lifecycle contracts are
  testable.

## Incremental path

### Phase 1: make the existing contract explicit

- Add a versioned presentation manifest to uploaded and compiled records.
- Record `format: "tsx"` and `runtime: "react"` for the existing path.
- Persist resolved capabilities and artifact integrity.
- Preserve backward compatibility for current artifacts.

### Phase 2: introduce trusted provider registries

- Wrap the current compiler as the TSX compiler provider.
- Add compiler and runtime registries in the composition layer.
- Reject unknown format/runtime combinations before compilation.
- Keep provider installation operator-controlled and deploy-time only.

### Phase 3: extract typed policies

- Move source, contract, resource, and activation checks into ordered policies.
- Apply monotonic denials for security invariants.
- Emit correlated audit events from authoritative lifecycle boundaries.

### Phase 4: add a second isolated format

- Implement `web-bundle` containing HTML, CSS, and JavaScript.
- Execute it through a sandboxed iframe runtime.
- Expose article data and navigation only through the capability protocol.
- Verify cleanup, failure fallback, rollback, and responsive behavior.

### Phase 5: evaluate language-neutral targets

- Evaluate WebAssembly only after the web-bundle seam is proven.
- Keep the same manifest, capability, audit, and activation contracts.
- Add a format only when it provides a concrete authoring or isolation benefit.

## Success criteria

The direction is successful when:

- TSX and at least one non-React format share the same upload, version,
  activation, rollback, reset, and audit lifecycle;
- adding a compiler/runtime provider does not change article domain handlers;
- a broken or hostile artifact cannot take down the landing page or kernel;
- every public presentation change is attributable and reversible;
- the default reader remains available when any provider fails;
- tenant code cannot acquire capabilities that were not resolved by kernel
  policy.

## Open questions

- Should presentation capabilities be fixed globally or configurable per
  tenant?
- Which metadata belongs in the immutable manifest versus the compiled artifact
  record?
- Can an iframe runtime meet the desired performance without weakening
  isolation?
- How should media uploads, transformations, and quotas fit the capability
  model?
- Which presentation contract changes require recompilation versus a runtime
  compatibility adapter?

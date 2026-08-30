# How programs run

Source code is not executed by a CPU as written. Toolchains translate it into
artifacts, the operating system loads those artifacts, and a runtime may add
another layer of interpretation or just-in-time compilation.

## 1. The machine underneath every paradigm

```mermaid
flowchart LR
  Fetch["Fetch instruction<br>at program counter"] --> Decode["Decode opcode<br>and operands"]
  Decode --> Read["Read registers<br>or memory"]
  Read --> Execute["Execute in ALU<br>or control unit"]
  Execute --> Write["Write result<br>and flags"]
  Write --> Next{"Branch or next<br>instruction?"}
  Next -->|"next"| Fetch
  Next -->|"jump / call / return"| Fetch
```

At this level, a loop is a conditional jump, a function call changes control
flow and preserves a return location, and an object is ultimately bytes plus
conventions. Higher-level paradigms make those operations understandable and
safe enough for humans to compose.

## 2. Native compilation pipeline

For a conventional C/C++-style toolchain, the linear path is best understood
as a flowchart. GCC documents the central sequence as preprocessing,
compilation, assembly, and linking.

```mermaid
flowchart LR
  Source["Source files<br>.c / .cpp"] --> Preprocess["Preprocessor<br>expand includes and macros"]
  Preprocess --> Frontend["Compiler frontend<br>tokens, AST, type checks"]
  Frontend --> IR["Intermediate representation<br>language-neutral operations"]
  IR --> Optimize["Optimizer<br>transform without changing meaning"]
  Optimize --> Backend["Compiler backend<br>target instructions"]
  Backend --> Assembly["Assembly<br>.s"]
  Assembly --> Assembler["Assembler"]
  Assembler --> Objects["Object files<br>.o / .obj"]
  Objects --> Linker["Linker<br>resolve symbols and relocate"]
  Libraries["Static or import libraries"] --> Linker
  Linker --> Executable["Executable<br>ELF / PE / Mach-O"]

  classDef source fill:#eef2ff,stroke:#4f46e5,color:#1e1b4b
  classDef transform fill:#ecfeff,stroke:#0891b2,color:#164e63
  classDef artifact fill:#f0fdf4,stroke:#16a34a,color:#14532d
  class Source,Libraries source
  class Preprocess,Frontend,IR,Optimize,Backend,Assembler,Linker transform
  class Assembly,Objects,Executable artifact
```

Not every language exposes every stage, and toolchains often fuse stages, but
the conceptual responsibilities remain useful.

## 3. Loading an executable

```mermaid
flowchart TD
  Launch["User or parent process launches executable"] --> Kernel["OS kernel validates file format"]
  Kernel --> AddressSpace["Create virtual address space"]
  AddressSpace --> Map["Map code, data, and shared libraries"]
  Map --> Relocate["Resolve imports and apply relocations"]
  Relocate --> RuntimeInit["Initialize language runtime and globals"]
  RuntimeInit --> Entry["Transfer control to entry point"]
  Entry --> Main["Application code runs"]
  Main --> Exit["Destructors, runtime cleanup, process exit"]
```

```mermaid
flowchart TB
  High["High addresses"]
  Stack["Stack<br>calls, parameters, local values"]
  Gap["Unused / guard space"]
  Heap["Heap<br>dynamic allocations"]
  Data["Data and BSS<br>globals and static values"]
  Code["Text<br>executable instructions"]
  Low["Low addresses"]

  High --> Stack --> Gap --> Heap --> Data --> Code --> Low
```

The exact layout varies by platform and security settings. The diagram is a
mental model, not a fixed memory-address contract.

## 4. Static and dynamic linking

```mermaid
flowchart LR
  subgraph BuildTime["Build time"]
    AppObj["Application object files"]
    StaticLib["Static library archive"]
    ImportInfo["Dynamic import metadata"]
    Link["Link editor"]
    AppObj --> Link
    StaticLib -->|"copy selected code"| Link
    ImportInfo -->|"record unresolved imports"| Link
    Link --> Image["Executable image"]
  end

  subgraph LoadTime["Load time"]
    Image --> Loader["OS loader"]
    Shared["DLL / .so / .dylib"] --> Dynamic["Dynamic linker"]
    Loader --> Dynamic
    Dynamic --> Memory["Resolved process image"]
  end
```

Static linking copies needed library code into the executable. Dynamic linking
leaves compatible symbol references for a loader to resolve against shared
libraries. The shared boundary is an ABI: binary format, symbol names, calling
conventions, data layout, and version assumptions.

## 5. Managed and browser runtimes

```mermaid
flowchart LR
  SourceA["Java / C# source"] --> Bytecode["Bytecode or IL"]
  Bytecode --> VM["JVM / CLR"]
  VM --> Interpreter["Interpret"]
  VM --> JIT["JIT compile hot paths"]
  Interpreter --> Native["CPU instructions"]
  JIT --> Native

  SourceB["JavaScript / TypeScript"] --> Bundle["JavaScript modules or bundle"]
  Bundle --> Engine["Browser JS engine"]
  Engine --> Parse["Parse and optimize"]
  Parse --> Native
```

```mermaid
flowchart TD
  HTML["HTML document"] --> DOM["DOM tree"]
  CSS["CSS"] --> CSSOM["CSSOM"]
  JS["JavaScript modules"] --> Engine["JavaScript engine"]
  Engine --> DOM
  DOM --> Render["Style, layout, paint, composite"]
  CSSOM --> Render
  Render --> Screen["Pixels and interaction"]
  Events["Input, network, timers"] --> EventLoop["Event loop and task queues"]
  EventLoop --> Engine
```

## 6. Where Agent-Native CMS enters the pipeline

The CMS does not upload a native executable or DLL into the server. Today it
accepts constrained TSX, compiles it to a browser JavaScript artifact, stores
that immutable version, and lets the article route load only the active one.

```mermaid
flowchart LR
  Agent["Coding agent"] -->|"TSX source"| MCP["Hosted MCP boundary"]
  MCP --> Validate["Contract and design validation"]
  Validate --> Esbuild["esbuild browser compilation"]
  Esbuild --> Artifact["Immutable JavaScript artifact"]
  Artifact --> Database[("PostgreSQL")]
  Database --> Activate["Transactional activation"]
  Activate --> Route["Article reader route"]
  Route --> Browser["Browser dynamically imports artifact"]
  Browser --> React["React mounts presentation"]

  Landing["CMS-owned landing page"] -.->|"not replaced"| Route
```

This resembles runtime plugin loading in lifecycle, but differs in trust and
location: the submitted program is presentation code for a browser boundary,
not a privileged server extension.

## References

- [GCC: options controlling the kind of output](https://gcc.gnu.org/onlinedocs/gcc/Overall-Options.html)
- [System V ABI: ELF object format and dynamic linking](https://refspecs.linuxfoundation.org/elf/elf.pdf)
- [Microsoft: PE format](https://learn.microsoft.com/en-us/windows/win32/debug/pe-format)
- [WebAssembly core specification](https://webassembly.github.io/spec/core/)


# Programming paradigms: a problem-driven survey

Programming paradigms do not replace the machine model. They add structures
that help humans control a growing kind of complexity.

## 1. The abstraction ladder

```mermaid
flowchart LR
  Instructions["Machine and assembly<br>Control instructions"] --> Structured["Structured programming<br>Control flow"]
  Structured --> Procedures["Procedural and modular<br>Reusable behavior and visibility"]
  Procedures --> Objects["OOP and ADTs<br>State, invariants, polymorphism"]
  Objects --> Declarative["Functional, logic, declarative<br>Meaning over execution steps"]
  Declarative --> Concurrent["Actors, CSP, reactive<br>Time and coordination"]
  Concurrent --> Distributed["Services and events<br>Process and failure boundaries"]
  Distributed --> Composition["Capability composition<br>Authority, scope, lifecycle"]
```

The arrows mean “new pressure became prominent,” not “the older style became
obsolete.” A modern system routinely uses several rows at once.

## 2. From jumps to structured control flow

```mermaid
flowchart TB
  ProblemA["Problem<br>CPU offers branches and jumps"] --> StyleA["Machine-level imperative"]
  StyleA --> GainA["Gain<br>precise hardware control"]
  GainA --> CostA["Remaining cost<br>execution path is hard to reason about"]

  CostA --> StyleB["Structured programming"]
  StyleB --> ToolsB["sequence, selection, iteration"]
  ToolsB --> GainB["Gain<br>local and nested control flow"]
  GainB --> CostB["Remaining cost<br>large programs still repeat behavior"]

  CostB --> StyleC["Procedural programming"]
  StyleC --> ToolsC["functions, parameters, call stack"]
  ToolsC --> GainC["Gain<br>name and reuse operations"]
```

Dijkstra's structured-programming work targeted the difficulty of relating a
program's textual structure to its execution history. It did not claim that a
CPU stops using jumps; it constrained how programmers express them.

## 3. Modules, abstract data types, and OOP

```mermaid
flowchart LR
  Global["Shared global state<br>and concrete dependencies"] --> Modules["Modules<br>hide names and implementation"]
  Modules --> ADT["Abstract data types<br>expose valid operations"]
  ADT --> OOP["Objects<br>bind identity, state, behavior"]
  OOP --> Polymorphism["Subtype or interface polymorphism<br>replace implementations"]

  Modules -.->|"solves"| Visibility["visibility and namespace collisions"]
  ADT -.->|"solves"| Invariants["representation and invariant protection"]
  OOP -.->|"solves"| Stateful["modeling collaborating stateful entities"]
  Polymorphism -.->|"solves"| Variation["variation behind stable messages"]
```

OOP's core contribution is not merely classes. It provides a way to preserve
state and invariants behind a message/interface boundary. Its common failure
mode is turning inheritance and object graphs into hidden coupling.

## 4. Functional, declarative, and logic styles

```mermaid
flowchart TB
  Mutation["Problem<br>mutation makes behavior depend on history"] --> FP["Functional programming"]
  FP --> FPTools["pure functions, immutable values, composition"]
  FPTools --> FPGain["local reasoning and easier concurrency"]

  Steps["Problem<br>implementation steps obscure intent"] --> Declarative["Declarative programming"]
  Declarative --> DeclTools["describe desired result or constraints"]
  DeclTools --> DeclGain["runtime chooses execution strategy"]

  Search["Problem<br>search space and relations dominate"] --> Logic["Logic programming"]
  Logic --> LogicTools["facts, rules, unification"]
  LogicTools --> LogicGain["derive answers rather than script steps"]
```

SQL is a familiar declarative example: callers specify the result shape while
the database optimizer chooses a physical plan.

## 5. Time, concurrency, and communication

```mermaid
flowchart LR
  Shared["Shared mutable state"] --> Threads["Threads and locks"]
  Threads --> LockCost["races, deadlocks, scheduling complexity"]
  LockCost --> Actors["Actors<br>isolated state and messages"]
  LockCost --> CSP["CSP<br>communicating sequential processes"]

  Inputs["Values change over time"] --> Events["Event-driven systems"]
  Events --> Reactive["Reactive streams<br>propagate change"]

  Actors --> Distributed["Distributed services"]
  CSP --> Distributed
  Reactive --> Distributed
  Distributed --> Failure["partial failure, latency, retries, consistency"]
```

Concurrency paradigms manage overlapping work in one or more processes.
Distributed architecture adds independent failure, network delay, and separate
deployment authority; it is not just “concurrency over HTTP.”

## 6. Components, services, plugins, and capabilities

```mermaid
flowchart TB
  Compile["Compile-time dependency"] --> DI["Dependency inversion<br>depend on contracts"]
  DI --> Components["Components<br>contract plus lifecycle"]
  Components --> Plugins["Plugins<br>host-controlled runtime extension"]
  Components --> Services["Services<br>contract across process boundary"]
  Plugins --> Capabilities["Capabilities<br>explicit bounded authority"]
  Services --> Capabilities
  Capabilities --> Scoped["Scoped and reversible composition"]
```

This row is where Cordis belongs. It is a runtime composition model built from
services, typed events, scopes, and reversible registrations. Those concepts
can host code written in OOP, functional, or procedural style.

## 7. What each approach primarily controls

| Approach | Primary unit | Main problem addressed | Typical remaining pressure |
| --- | --- | --- | --- |
| Machine / assembly | Instruction | Exact hardware execution | Human reasoning |
| Structured | Block | Arbitrary control flow | Reuse and scale |
| Procedural | Procedure | Reusable behavior | Data invariants |
| Modules / ADTs | Module / type | Visibility and representation | Runtime variation |
| OOP | Object | Stateful collaboration and polymorphism | Hidden coupling |
| Functional | Function / value | Mutation and composition | Effects and integration |
| Declarative / logic | Rule / relation | Intent over execution order | Runtime control and cost |
| Event-driven / reactive | Event / stream | Change over time | Causality and backpressure |
| Actor / CSP | Actor / channel | Concurrent coordination | Distributed failure |
| Components / plugins | Component | Replaceability and lifecycle | Authority and isolation |
| Services | Network contract | Independent processes and deploys | Latency and consistency |
| Capability composition | Capability / scope | Authority, context, reversible lifecycle | Governance and observability |

## 8. A modern application uses many paradigms simultaneously

```mermaid
flowchart TD
  Product["Agent-Native CMS"] --> Domain["Domain model<br>OOP and ADTs for invariants"]
  Product --> Handlers["Application handlers<br>procedural orchestration"]
  Product --> Queries["PostgreSQL<br>declarative SQL"]
  Product --> UI["React<br>component and reactive UI"]
  Product --> MCP["MCP over HTTP<br>client-server protocol"]
  Product --> Audit["Audit stream<br>event-driven delivery"]
  Product --> Presentation["Presentation runtime<br>plugin-like artifact lifecycle"]
```

The practical question is not “Which single paradigm wins?” It is “Which
pressure exists at this boundary, and which abstraction makes it explicit?”

## References

- [Dijkstra: Notes on Structured Programming](https://www.cs.utexas.edu/~EWD/transcriptions/EWD02xx/EWD249.html)
- [Parnas: On the Criteria To Be Used in Decomposing Systems into Modules](https://dl.acm.org/doi/10.1145/361598.361623)
- [Hoare: Communicating Sequential Processes](https://www.cs.cmu.edu/~crary/819-f09/Hoare78.pdf)
- [Hewitt, Bishop, and Steiger: A Universal Modular ACTOR Formalism](https://www.ijcai.org/Proceedings/73/Papers/027B.pdf)
- [DeepSeek Harness: Cordis primer](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cordis-primer.md)


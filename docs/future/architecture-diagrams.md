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
  Profile["Profile và các bundle layer có thứ tự"] --> Tree["Cây plugin được tổ hợp lúc khởi động"]
  Overlay["Cấu hình overlay của operator"] --> Tree

  subgraph Cordis["Shared context của Cordis"]
    Context["Registry các service theo key ổn định"]
    Events["Bộ điều phối typed event"]
    Effects["Registry các effect có thể tháo ngược"]
  end

  Tree --> PluginA["Plugin cung cấp service"]
  Tree --> PluginB["Plugin sử dụng service"]
  Tree --> PluginC["Plugin policy hoặc observer"]

  PluginA -->|"đăng ký service bằng key ổn định"| Context
  PluginB -->|"inject key của service cần dùng"| Context
  PluginC -->|"lắng nghe, wrap, từ chối hoặc quan sát"| Events
  PluginA -->|"phát typed lifecycle event"| Events

  PluginA -->|"đăng ký disposer"| Effects
  PluginB -->|"đăng ký disposer"| Effects
  PluginC -->|"đăng ký disposer"| Effects
  Effects -->|"unload hoặc reload"| Dispose["Tháo registration theo thứ tự an toàn"]

  Context --> Result["Capability có thể thay provider"]
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
  Agent["Coding agent"] -->|"Tenant bearer key qua MCP"| Mcp["Biên stateful MCP"]
  Admin["Giao diện operator"] -->|"Admin session chỉ dùng REST"| AdminApi["Biên quản trị"]

  subgraph Kernel["CMS kernel đặc quyền"]
    Auth["Xác thực và quyền sở hữu tenant"]
    ToolPipeline["Typed MCP policy pipeline"]
    Handlers["Article và presentation handlers"]
    Lifecycle["Artifact lifecycle có transaction"]
    Audit["Durable audit stream an toàn"]
    PublicDelivery["Public article delivery"]
  end

  Mcp --> Auth
  AdminApi --> Auth
  Auth --> ToolPipeline
  ToolPipeline --> Handlers
  Handlers --> Lifecycle
  Handlers --> Audit
  Lifecycle --> Audit

  subgraph Providers["Capability provider tin cậy do operator cài"]
    CompilerRegistry["Registry compiler provider"]
    RuntimeRegistry["Registry runtime provider"]
    PolicyRegistry["Registry presentation policy"]
    MediaProvider["Media provider được phê duyệt"]
  end

  Lifecycle --> CompilerRegistry
  Lifecycle --> PolicyRegistry
  PublicDelivery --> RuntimeRegistry
  PublicDelivery --> MediaProvider

  subgraph Persistence["PostgreSQL source of record"]
    Articles[("Article và tenant")]
    Artifacts[("Presentation artifact bất biến")]
    Events[("Audit event")]
  end

  Handlers --> Articles
  Lifecycle --> Artifacts
  Audit --> Events
  PublicDelivery --> Articles
  PublicDelivery --> Artifacts

  subgraph Browser["Trust boundary trên browser"]
    Landing["Landing page do CMS sở hữu"]
    Reader["Article reader shell"]
    Sandbox["Presentation runtime giới hạn capability"]
    Fallback["Default article reader"]
  end

  PublicDelivery --> Landing
  PublicDelivery --> Reader
  RuntimeRegistry --> Sandbox
  Reader --> Sandbox
  Reader --> Fallback
  Artifacts -.->|"chỉ artifact đã xác minh"| Sandbox

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
  participant MCP as Biên MCP
  participant Auth as Xác thực tenant
  participant Policy as Policy pipeline
  participant Registry as Compiler registry
  participant Compiler as Compiler theo format
  participant Store as PostgreSQL
  participant Audit as Audit stream

  Agent->>MCP: Upload source và presentation manifest
  MCP->>Auth: Xác thực bearer credential
  Auth-->>MCP: Tenant identity và credential identity
  MCP->>Policy: Kiểm tra format, contract, kích thước và capability

  alt Request bị từ chối
    Policy-->>MCP: Từ chối cuối cùng với lý do an toàn
    MCP->>Audit: Ghi presentation.upload_denied
    MCP-->>Agent: Từ chối mà không compile
  else Request được chấp nhận
    Policy-->>MCP: Capability set đã resolve
    MCP->>Registry: Tìm trusted compiler theo format
    Registry-->>MCP: Compiler provider
    MCP->>Compiler: Compile source với contract đã resolve

    alt Compile thất bại
      Compiler-->>MCP: Compile error có cấu trúc
      MCP->>Store: Lưu immutable version thất bại
      MCP->>Audit: Ghi presentation.compile_failed
      MCP-->>Agent: Failed version và diagnostics
    else Compile thành công
      Compiler-->>MCP: Artifact, manifest và integrity hash
      MCP->>Store: Lưu immutable compiled version
      MCP->>Audit: Ghi presentation.compile_succeeded
      MCP-->>Agent: Version đã compile nhưng chưa active
    end
  end

  Agent->>MCP: Activate compiled presentation version
  MCP->>Auth: Kiểm tra lại quyền sở hữu tenant
  MCP->>Policy: Kiểm tra tương thích trước activation

  alt Activation bị từ chối
    Policy-->>MCP: Từ chối hoặc contract không tương thích
    MCP->>Audit: Ghi presentation.activation_denied
    MCP-->>Agent: Giữ nguyên active version trước đó
  else Activation được chấp nhận
    Policy-->>MCP: Cho phép activation
    MCP->>Store: Đổi active presentation ID nguyên tử
    Store-->>MCP: Active ID cũ và mới
    MCP->>Audit: Ghi presentation.activated
    MCP-->>Agent: Version đã active và trạng thái article
  end
```

## 4. Public runtime, fallback, and reversible cleanup

The browser runtime must fail locally to one article. A broken artifact must not
break the CMS landing page, routing, or other articles.

```mermaid
sequenceDiagram
  autonumber
  actor Reader as Người đọc
  participant Route as Article route
  participant Delivery as Public delivery
  participant Store as Artifact store
  participant Registry as Runtime registry
  participant Shell as CMS reader shell
  participant Runtime as Presentation runtime
  participant Fallback as Default reader

  Reader->>Route: GET article bằng UUID và slug
  Route->>Delivery: Load published article và active artifact
  Delivery->>Store: Đọc immutable active version
  Store-->>Delivery: Article, manifest, artifact và integrity

  alt Không có custom presentation đang active
    Delivery-->>Shell: Article không có artifact
    Shell->>Fallback: Render CMS default reader
    Fallback-->>Reader: Trải nghiệm đọc ổn định
  else Có active artifact
    Delivery->>Delivery: Xác minh integrity và contract version
    Delivery->>Registry: Resolve trusted runtime provider

    alt Artifact hoặc provider bị từ chối
      Registry-->>Shell: Runtime không hỗ trợ hoặc không hợp lệ
      Shell->>Fallback: Render CMS default reader
      Fallback-->>Reader: Trải nghiệm đọc ổn định
    else Runtime được chấp nhận
      Registry-->>Shell: Runtime provider
      Shell->>Runtime: Mount với article context giới hạn capability

      alt Runtime mount thành công
        Runtime-->>Reader: Custom article presentation
      else Runtime lỗi hoặc timeout
        Runtime-->>Shell: Lỗi được cô lập
        Shell->>Runtime: Dispose listener, frame, worker và object URL
        Shell->>Fallback: Render CMS default reader
        Fallback-->>Reader: Trải nghiệm đọc đã phục hồi
      end
    end
  end

  opt Điều hướng, rollback, reset hoặc thay version
    Shell->>Runtime: Dispose runtime cũ một cách xác định
    Runtime-->>Shell: Cleanup hoàn tất
  end
```

## 5. Presentation artifact state model

This state diagram makes reversibility explicit. A failed upload is retained for
diagnostics but can never become active. Rollback activates an older compatible
compiled version rather than mutating an artifact in place.

```mermaid
stateDiagram-v2
  state "Đã tải lên" as Uploaded
  state "Đang compile" as Compiling
  state "Đã compile" as Compiled
  state "Compile thất bại" as Failed
  state "Đang active" as Active
  state "Đã bị version khác thay thế" as Superseded
  state "Đã reset về default reader" as Reset
  state "Đã xóa" as Deleted
  [*] --> Uploaded
  Uploaded --> Compiling : kiểm tra và compile
  Compiling --> Compiled : compile thành công
  Compiling --> Failed : compile thất bại
  Compiled --> Active : activate bằng transaction
  Active --> Superseded : activate version khác
  Superseded --> Active : rollback về version này
  Active --> Reset : reset về default reader
  Reset --> Active : active lại version tương thích
  Compiled --> Deleted : xóa article
  Failed --> Deleted : xóa article
  Superseded --> Deleted : xóa article
  Active --> Deleted : xóa article
  Reset --> Deleted : xóa article
  Failed --> [*]
  Deleted --> [*]
```

The database record remains immutable after compilation. Terms such as
`Active`, `Superseded`, and `Reset` describe the article's selection relationship
to artifact versions, not source-code mutation.

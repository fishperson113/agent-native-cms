import type { CSSProperties, ReactNode } from "react";

type ContainerProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

export function ArticleRoot({ children, className, style }: ContainerProps) {
  return (
    <article
      className={className}
      style={{
        boxSizing: "border-box",
        width: "100%",
        minWidth: 0,
        minHeight: "100dvh",
        overflowX: "clip",
        lineHeight: 1.6,
        ...style,
      }}
    >
      {children}
    </article>
  );
}

export function Hero({
  title,
  eyebrow,
  subtitle,
  children,
  className,
  style,
  titleStyle,
  eyebrowStyle,
  subtitleStyle,
}: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  titleStyle?: CSSProperties;
  eyebrowStyle?: CSSProperties;
  subtitleStyle?: CSSProperties;
}) {
  return (
    <header
      className={className}
      style={{
        boxSizing: "border-box",
        width: "100%",
        padding: "clamp(3.5rem, 9vw, 7rem) clamp(1.25rem, 6vw, 6rem)",
        ...style,
      }}
    >
      {eyebrow ? (
        <p style={{ margin: "0 0 1rem", ...eyebrowStyle }}>{eyebrow}</p>
      ) : null}
      <h1
        style={{
          maxWidth: "16ch",
          margin: 0,
          fontSize: "clamp(2.5rem, 8vw, 6.5rem)",
          lineHeight: 0.98,
          overflowWrap: "anywhere",
          ...titleStyle,
        }}
      >
        {title}
      </h1>
      {subtitle ? (
        <p
          style={{
            maxWidth: "60ch",
            margin: "1.5rem 0 0",
            fontSize: "clamp(1rem, 2vw, 1.25rem)",
            lineHeight: 1.6,
            ...subtitleStyle,
          }}
        >
          {subtitle}
        </p>
      ) : null}
      {children}
    </header>
  );
}

export function Section({ children, id, className, style }: ContainerProps & { id?: string }) {
  return (
    <section
      id={id}
      className={className}
      style={{
        boxSizing: "border-box",
        width: "100%",
        minWidth: 0,
        padding: "clamp(2.5rem, 7vw, 6rem) clamp(1.25rem, 6vw, 6rem)",
        ...style,
      }}
    >
      {children}
    </section>
  );
}

export function Markdown({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div className={className} style={{ whiteSpace: "pre-wrap" }}>
      {content}
    </div>
  );
}

export function Grid({
  children,
  columns = 2,
  gap = 16,
  minItemWidth = 240,
  className,
  style,
}: ContainerProps & {
  columns?: number;
  gap?: number;
  minItemWidth?: number;
}) {
  const safeColumns = Math.max(1, Math.floor(columns));
  const safeMinWidth = Math.max(160, Math.floor(minItemWidth));
  return (
    <div
      className={className}
      style={{
        display: "grid",
        width: "100%",
        minWidth: 0,
        gridTemplateColumns:
          safeColumns === 1
            ? "minmax(0, 1fr)"
            : `repeat(auto-fit, minmax(min(100%, ${safeMinWidth}px), 1fr))`,
        gap,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Stack({
  children,
  gap = 16,
  className,
  style,
}: ContainerProps & { gap?: number }) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        width: "100%",
        minWidth: 0,
        flexDirection: "column",
        gap,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Card({ children, className }: Omit<ContainerProps, "style">) {
  return <div className={className}>{children}</div>;
}

export function Callout({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "success" | "warning";
}) {
  return <aside data-tone={tone}>{children}</aside>;
}

export function Quote({ children, cite }: { children: ReactNode; cite?: string }) {
  return (
    <blockquote>
      {children}
      {cite ? <footer>{cite}</footer> : null}
    </blockquote>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return <span>{children}</span>;
}

export function Divider() {
  return <hr />;
}

export function Timeline({
  items,
}: {
  items: Array<{ title: string; description?: string }>;
}) {
  return (
    <ol>
      {items.map((item, index) => (
        <li key={`${item.title}-${index}`}>
          <strong>{item.title}</strong>
          {item.description ? <p>{item.description}</p> : null}
        </li>
      ))}
    </ol>
  );
}

export function Image({
  src,
  alt,
  className,
  style,
  loading = "lazy",
}: {
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  loading?: "eager" | "lazy";
}) {
  return (
    // The presentation program owns its visual/network policy in the current PoC.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      style={{ display: "block", width: "100%", maxWidth: "100%", height: "auto", ...style }}
    />
  );
}

export function Button({
  children,
  onClick,
  disabled,
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  );
}

import type { ReactNode } from "react";
import type { ArticleDto } from "@/modules/content/application/article.dto";

function inlineMarkdown(value: string): ReactNode[] {
  const pattern = /(\[([^\]]+)\]\((https?:\/\/[^)]+)\)|\*\*([^*]+)\*\*)/g;
  const output: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(value)) !== null) {
    if (match.index > cursor) output.push(value.slice(cursor, match.index));
    if (match[2] && match[3]) {
      output.push(<a key={`${match.index}-link`} href={match[3]} rel="noreferrer">{match[2]}</a>);
    } else if (match[4]) {
      output.push(<strong key={`${match.index}-strong`}>{match[4]}</strong>);
    }
    cursor = pattern.lastIndex;
  }
  if (cursor < value.length) output.push(value.slice(cursor));
  return output;
}

function MarkdownBody({ markdown }: { markdown: string }) {
  const nodes: ReactNode[] = [];
  let list: string[] = [];
  const flushList = () => {
    if (list.length === 0) return;
    nodes.push(<ul key={`list-${nodes.length}`}>{list.map((item, index) => <li key={`${item}-${index}`}>{inlineMarkdown(item)}</li>)}</ul>);
    list = [];
  };
  markdown.split(/\r?\n/).forEach((line, index) => {
    const value = line.trim();
    if (value.startsWith("- ")) { list.push(value.slice(2)); return; }
    flushList();
    if (!value || value.startsWith("# ")) return;
    if (value.startsWith("### ")) nodes.push(<h3 key={index}>{inlineMarkdown(value.slice(4))}</h3>);
    else if (value.startsWith("## ")) nodes.push(<h2 key={index}>{inlineMarkdown(value.slice(3))}</h2>);
    else nodes.push(<p key={index}>{inlineMarkdown(value)}</p>);
  });
  flushList();
  return <div className="article-copy">{nodes}</div>;
}

export function DefaultArticleReader({ article }: { article: ArticleDto }) {
  const published = new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(new Date(article.updatedAt));
  return (
    <main className="min-h-dvh bg-[var(--paper-raised)]">
      <article className="mx-auto grid max-w-[1280px] gap-10 px-5 py-10 sm:px-8 sm:py-16 lg:grid-cols-[minmax(0,0.62fr)_minmax(0,1fr)] lg:gap-20 lg:px-12 lg:py-24">
        <header className="lg:sticky lg:top-16 lg:self-start">
          <p className="mb-7 font-mono text-xs uppercase tracking-[0.22em] text-[var(--ink-muted)]">Published {published}</p>
          <h1 className="font-serif text-[clamp(3.25rem,7vw,7.5rem)] leading-[0.91] tracking-[-0.055em]">{article.title}</h1>
          <div className="mt-10 h-1 w-20 bg-[var(--signal)]" />
        </header>
        <section className="border-t editorial-rule pt-9 lg:mt-24">
          <MarkdownBody markdown={article.markdown} />
        </section>
      </article>
    </main>
  );
}

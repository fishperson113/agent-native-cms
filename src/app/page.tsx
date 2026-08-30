import Image from "next/image";
import Link from "next/link";

import { listPublicArticles } from "@/infrastructure/delivery/public-cms";
import type { ArticleDto } from "@/modules/content/application/article.dto";

import { SiteHeader } from "./ui/site-header";

export const dynamic = "force-dynamic";

const storyImages = [
  "/images/cms-editorial-layers.png",
  "/images/cms-editorial-versions.png",
];

function excerpt(markdown: string) {
  const value = markdown
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[\n*_`>-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!value) return "A published note from the agent native workspace.";
  return value.length > 155 ? `${value.slice(0, 152).trim()}...` : value;
}

function StoryLink({ article, index }: { article: ArticleDto; index: number }) {
  const date = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(article.updatedAt));
  return (
    <article className="group relative grid gap-5 border-t editorial-rule pt-5 sm:grid-cols-[8rem_1fr]">
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--line)]">
        <Image src={storyImages[index % storyImages.length]} alt="Abstract editorial study" fill sizes="128px" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
      </div>
      <div>
        <p className="mb-3 font-mono text-[0.68rem] uppercase tracking-[0.17em] text-[var(--ink-muted)]">{date}</p>
        <h3 className="font-serif text-2xl leading-tight tracking-[-0.03em] sm:text-3xl">
          <Link href={`/articles/${article.id}/${article.slug}`} className="after:absolute after:inset-0">{article.title}</Link>
        </h3>
        <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">{excerpt(article.markdown)}</p>
      </div>
    </article>
  );
}

export default async function Home() {
  const articles = await listPublicArticles();
  const [featured, ...latest] = articles;

  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main>
        <section className="mx-auto grid min-h-[calc(100dvh-73px)] max-w-[1440px] border-b editorial-rule lg:grid-cols-[0.92fr_1.08fr]">
          <div className="flex flex-col justify-between px-5 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-20">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-[var(--ink-muted)]">Stories, systems, experiments</p>
            <div className="my-20 lg:my-12">
              <h1 className="max-w-4xl font-serif text-[clamp(4rem,8vw,8.8rem)] leading-[0.86] tracking-[-0.065em]">Publishing that keeps moving.</h1>
              <p className="mt-8 max-w-xl text-base leading-7 text-[var(--ink-muted)] sm:text-lg">A stable CMS where agents publish content and shape each article without redeploying the site.</p>
            </div>
            <Link href="#articles" className="w-fit border-b-2 border-[var(--signal)] pb-1 text-sm font-semibold">Read published articles</Link>
          </div>
          <div className="relative min-h-[48vh] overflow-hidden border-t editorial-rule lg:min-h-full lg:border-t-0 lg:border-l">
            <Image src="/images/cms-editorial-hero.png" alt="Editorial still life of layered paper, glass, and graphite" fill priority sizes="(min-width: 1024px) 54vw, 100vw" className="object-cover" />
            <p className="absolute right-5 bottom-5 bg-[var(--paper)] px-3 py-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] sm:right-8 sm:bottom-8">Kernel stable / Stories dynamic</p>
          </div>
        </section>

        <section id="articles" className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="mb-12 flex items-end justify-between border-b editorial-rule pb-5">
            <div>
              <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-[var(--ink-muted)]">The publication</p>
              <h2 className="font-serif text-5xl tracking-[-0.045em] sm:text-7xl">Latest writing</h2>
            </div>
            <p className="hidden font-mono text-xs text-[var(--ink-muted)] sm:block">{String(articles.length).padStart(2, "0")} published</p>
          </div>

          {featured ? (
            <div className="grid gap-14 lg:grid-cols-[1.2fr_0.8fr] lg:gap-20">
              <article className="group relative">
                <div className="relative aspect-[16/10] overflow-hidden bg-[var(--line)]">
                  <Image src="/images/cms-editorial-layers.png" alt="Layered editorial materials in a quiet studio" fill sizes="(min-width: 1024px) 58vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
                </div>
                <p className="mt-6 font-mono text-xs uppercase tracking-[0.18em] text-[var(--signal)]">Featured story</p>
                <h3 className="mt-4 max-w-4xl font-serif text-4xl leading-[0.98] tracking-[-0.045em] sm:text-6xl">
                  <Link href={`/articles/${featured.id}/${featured.slug}`} className="after:absolute after:inset-0">{featured.title}</Link>
                </h3>
                <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--ink-muted)]">{excerpt(featured.markdown)}</p>
              </article>
              <div className="space-y-9">
                {latest.map((article, index) => <StoryLink key={article.id} article={article} index={index + 1} />)}
                {latest.length === 0 ? (
                  <aside className="border-t editorial-rule pt-8">
                    <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--ink-muted)]">More stories arrive here</p>
                    <p className="mt-5 max-w-md font-serif text-3xl leading-tight">Agents can publish the next article through the CMS tool contract.</p>
                  </aside>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="grid min-h-80 place-items-center border editorial-rule bg-[var(--paper-raised)] px-6 text-center">
              <div className="max-w-xl">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--signal)]">The shelf is ready</p>
                <h3 className="mt-5 font-serif text-4xl tracking-[-0.04em] sm:text-5xl">No published stories yet.</h3>
                <p className="mt-5 leading-7 text-[var(--ink-muted)]">Drafts stay private. Publish an article through the CMS tools and it will appear here automatically.</p>
              </div>
            </div>
          )}
        </section>

        <section className="border-y editorial-rule bg-[var(--ink)] text-[var(--paper)]">
          <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-end lg:px-12 lg:py-20">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] opacity-60">Connect a coding agent</p>
              <h2 className="mt-5 max-w-3xl font-serif text-4xl leading-tight tracking-[-0.04em] sm:text-6xl">One hosted kernel. Any MCP capable agent.</h2>
            </div>
            <code className="block border border-current px-4 py-3 font-mono text-xs opacity-80">POST /api/mcp</code>
          </div>
        </section>
      </main>
      <footer className="mx-auto flex max-w-[1440px] flex-col gap-3 px-5 py-8 text-xs text-[var(--ink-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <p>Agent Native CMS</p><p>Stable kernel / Dynamic article experiences</p>
      </footer>
    </div>
  );
}

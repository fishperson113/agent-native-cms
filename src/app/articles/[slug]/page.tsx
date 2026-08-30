import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicArticle } from "@/infrastructure/delivery/public-cms";
import { ArticleNotFoundError } from "@/modules/content/domain/article.errors";
import { ArticleExperienceShell } from "../../ui/article-experience-shell";
import { DefaultArticleReader } from "../../ui/default-article-reader";
import { DynamicArticlePresentation } from "../../ui/dynamic-article-presentation";

export const dynamic = "force-dynamic";

async function loadArticle(slug: string) {
  try { return await getPublicArticle(slug); }
  catch (error) { if (error instanceof ArticleNotFoundError) notFound(); throw error; }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await loadArticle(slug);
  return { title: article.title };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await loadArticle(slug);
  const fallback = <DefaultArticleReader article={article} />;
  if (!article.activePresentationId) {
    return <ArticleExperienceShell>{fallback}</ArticleExperienceShell>;
  }
  const artifactUrl = `/api/articles/${encodeURIComponent(slug)}/presentation?version=${encodeURIComponent(article.activePresentationId)}`;
  return (
    <ArticleExperienceShell>
      <DynamicArticlePresentation
        article={article}
        artifactUrl={artifactUrl}
        fallback={fallback}
      />
    </ArticleExperienceShell>
  );
}

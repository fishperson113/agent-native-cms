import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getPublicArticle } from "@/infrastructure/delivery/public-cms";
import { ArticleNotFoundError } from "@/modules/content/domain/article.errors";

import { ArticleExperienceShell } from "../../../ui/article-experience-shell";
import { DefaultArticleReader } from "../../../ui/default-article-reader";
import { DynamicArticlePresentation } from "../../../ui/dynamic-article-presentation";

export const dynamic = "force-dynamic";

type ArticlePageParams = {
  articleId: string;
  slug: string;
};

async function loadArticle(id: string) {
  try {
    return await getPublicArticle(id);
  } catch (error) {
    if (error instanceof ArticleNotFoundError) notFound();
    throw error;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<ArticlePageParams>;
}): Promise<Metadata> {
  const { articleId } = await params;
  const article = await loadArticle(articleId);
  return { title: article.title };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<ArticlePageParams>;
}) {
  const { articleId, slug } = await params;
  const article = await loadArticle(articleId);
  if (slug !== article.slug) {
    redirect(`/articles/${article.id}/${article.slug}`);
  }

  const fallback = <DefaultArticleReader article={article} />;
  if (!article.activePresentationId) {
    return <ArticleExperienceShell>{fallback}</ArticleExperienceShell>;
  }

  const artifactUrl = `/api/articles/${encodeURIComponent(article.id)}/presentation?version=${encodeURIComponent(article.activePresentationId)}`;
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

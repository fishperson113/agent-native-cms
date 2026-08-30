import type {
  ArticleId,
  ArticlePresentationId,
  TenantId,
} from "@/shared/kernel/identifiers";

import { ArticleTitleRequiredError } from "./article.errors";
import { ArticleSlug } from "./article-slug";

export type ArticleStatus = "draft" | "published";

export type ArticleSnapshot = {
  id: ArticleId;
  tenantId: TenantId;
  title: string;
  slug: string;
  markdown: string;
  status: ArticleStatus;
  activePresentationId?: ArticlePresentationId;
  createdAt: Date;
  updatedAt: Date;
};

type CreateArticleInput = {
  id: ArticleId;
  tenantId: TenantId;
  title: string;
  slug: string;
  markdown?: string;
  now: Date;
};

export class Article {
  private constructor(
    readonly id: ArticleId,
    readonly tenantId: TenantId,
    private titleValue: string,
    private slugValue: ArticleSlug,
    private markdownValue: string,
    private statusValue: ArticleStatus,
    private activePresentationIdValue: ArticlePresentationId | undefined,
    readonly createdAt: Date,
    private updatedAtValue: Date,
  ) {}

  static create(input: CreateArticleInput): Article {
    return new Article(
      input.id,
      input.tenantId,
      input.title.trim(),
      ArticleSlug.create(input.slug),
      input.markdown ?? "",
      "draft",
      undefined,
      input.now,
      input.now,
    );
  }

  static reconstitute(snapshot: ArticleSnapshot): Article {
    return new Article(
      snapshot.id,
      snapshot.tenantId,
      snapshot.title,
      ArticleSlug.create(snapshot.slug),
      snapshot.markdown,
      snapshot.status,
      snapshot.activePresentationId,
      snapshot.createdAt,
      snapshot.updatedAt,
    );
  }

  get title(): string {
    return this.titleValue;
  }

  get slug(): ArticleSlug {
    return this.slugValue;
  }

  get markdown(): string {
    return this.markdownValue;
  }

  get status(): ArticleStatus {
    return this.statusValue;
  }

  get activePresentationId(): ArticlePresentationId | undefined {
    return this.activePresentationIdValue;
  }

  get updatedAt(): Date {
    return this.updatedAtValue;
  }

  changeTitle(title: string, now: Date): void {
    const normalized = title.trim();
    if (this.statusValue === "published" && !normalized) {
      throw new ArticleTitleRequiredError();
    }

    this.titleValue = normalized;
    this.updatedAtValue = now;
  }

  changeSlug(slug: string, now: Date): void {
    this.slugValue = ArticleSlug.create(slug);
    this.updatedAtValue = now;
  }

  changeMarkdown(markdown: string, now: Date): void {
    this.markdownValue = markdown;
    this.updatedAtValue = now;
  }

  publish(now: Date): void {
    if (!this.titleValue.trim()) {
      throw new ArticleTitleRequiredError();
    }

    this.statusValue = "published";
    this.updatedAtValue = now;
  }

  unpublish(now: Date): void {
    this.statusValue = "draft";
    this.updatedAtValue = now;
  }

  attachPresentation(
    presentationId: ArticlePresentationId,
    now: Date,
  ): void {
    this.activePresentationIdValue = presentationId;
    this.updatedAtValue = now;
  }

  detachPresentation(now: Date): void {
    this.activePresentationIdValue = undefined;
    this.updatedAtValue = now;
  }

  toSnapshot(): ArticleSnapshot {
    return {
      id: this.id,
      tenantId: this.tenantId,
      title: this.titleValue,
      slug: this.slugValue.value,
      markdown: this.markdownValue,
      status: this.statusValue,
      activePresentationId: this.activePresentationIdValue,
      createdAt: this.createdAt,
      updatedAt: this.updatedAtValue,
    };
  }
}

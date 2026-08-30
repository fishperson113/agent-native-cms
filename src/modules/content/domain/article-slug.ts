import { InvalidArticleSlugError } from "./article.errors";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class ArticleSlug {
  private constructor(readonly value: string) {}

  static create(value: string): ArticleSlug {
    const normalized = value.trim();

    if (
      normalized.length === 0 ||
      normalized.length > 120 ||
      !slugPattern.test(normalized)
    ) {
      throw new InvalidArticleSlugError(value);
    }

    return new ArticleSlug(normalized);
  }

  equals(other: ArticleSlug): boolean {
    return this.value === other.value;
  }
}

import { DomainError } from "@/shared/kernel/domain-error";

export class InvalidArticleSlugError extends DomainError {
  readonly code = "INVALID_ARTICLE_SLUG";

  constructor(value: string) {
    super(`Article slug "${value}" is invalid.`);
  }
}

export class ArticleTitleRequiredError extends DomainError {
  readonly code = "ARTICLE_TITLE_REQUIRED";

  constructor() {
    super("An article title is required before publishing.");
  }
}

export class ArticleSlugAlreadyExistsError extends DomainError {
  readonly code = "ARTICLE_SLUG_ALREADY_EXISTS";

  constructor(slug: string) {
    super(`An article with slug "${slug}" already exists for this tenant.`);
  }
}

export class ArticleNotFoundError extends DomainError {
  readonly code = "ARTICLE_NOT_FOUND";

  constructor() {
    super("Article not found.");
  }
}

export class TenantNotFoundError extends DomainError {
  readonly code = "TENANT_NOT_FOUND";

  constructor() {
    super("Tenant not found.");
  }
}

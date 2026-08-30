import type {
  ArticleId,
  ArticlePresentationId,
  TenantId,
} from "@/shared/kernel/identifiers";

import {
  CompiledPresentationRequiredError,
  PresentationFailureReasonRequiredError,
  PresentationNotCompiledError,
  PresentationSourceRequiredError,
} from "./article-presentation.errors";

export type PresentationStatus = "draft" | "compiled" | "failed" | "active";

export type ArticlePresentationSnapshot = {
  id: ArticlePresentationId;
  tenantId: TenantId;
  articleId: ArticleId;
  sourceCode: string;
  compiledCode?: string;
  status: PresentationStatus;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
};

type CreateArticlePresentationInput = {
  id: ArticlePresentationId;
  tenantId: TenantId;
  articleId: ArticleId;
  sourceCode: string;
  now: Date;
};

export class ArticlePresentation {
  private constructor(
    readonly id: ArticlePresentationId,
    readonly tenantId: TenantId,
    readonly articleId: ArticleId,
    readonly sourceCode: string,
    private compiledCodeValue: string | undefined,
    private statusValue: PresentationStatus,
    private failureReasonValue: string | undefined,
    readonly createdAt: Date,
    private updatedAtValue: Date,
  ) {}

  static create(input: CreateArticlePresentationInput): ArticlePresentation {
    const sourceCode = input.sourceCode.trim();
    if (!sourceCode) {
      throw new PresentationSourceRequiredError();
    }

    return new ArticlePresentation(
      input.id,
      input.tenantId,
      input.articleId,
      sourceCode,
      undefined,
      "draft",
      undefined,
      input.now,
      input.now,
    );
  }

  static reconstitute(
    snapshot: ArticlePresentationSnapshot,
  ): ArticlePresentation {
    if (!snapshot.sourceCode.trim()) {
      throw new PresentationSourceRequiredError();
    }

    return new ArticlePresentation(
      snapshot.id,
      snapshot.tenantId,
      snapshot.articleId,
      snapshot.sourceCode,
      snapshot.compiledCode,
      snapshot.status,
      snapshot.failureReason,
      snapshot.createdAt,
      snapshot.updatedAt,
    );
  }

  get compiledCode(): string | undefined {
    return this.compiledCodeValue;
  }

  get status(): PresentationStatus {
    return this.statusValue;
  }

  get failureReason(): string | undefined {
    return this.failureReasonValue;
  }

  get updatedAt(): Date {
    return this.updatedAtValue;
  }

  markCompiled(compiledCode: string, now: Date): void {
    if (!compiledCode.trim()) {
      throw new CompiledPresentationRequiredError();
    }

    this.compiledCodeValue = compiledCode;
    this.statusValue = "compiled";
    this.failureReasonValue = undefined;
    this.updatedAtValue = now;
  }

  markFailed(reason: string, now: Date): void {
    const failureReason = reason.trim();
    if (!failureReason) {
      throw new PresentationFailureReasonRequiredError();
    }

    this.compiledCodeValue = undefined;
    this.statusValue = "failed";
    this.failureReasonValue = failureReason;
    this.updatedAtValue = now;
  }

  activate(now: Date): void {
    if (this.statusValue !== "compiled" || !this.compiledCodeValue) {
      throw new PresentationNotCompiledError();
    }

    this.statusValue = "active";
    this.updatedAtValue = now;
  }

  deactivate(now: Date): void {
    if (this.statusValue !== "active") {
      return;
    }

    this.statusValue = "compiled";
    this.updatedAtValue = now;
  }

  toSnapshot(): ArticlePresentationSnapshot {
    return {
      id: this.id,
      tenantId: this.tenantId,
      articleId: this.articleId,
      sourceCode: this.sourceCode,
      compiledCode: this.compiledCodeValue,
      status: this.statusValue,
      failureReason: this.failureReasonValue,
      createdAt: this.createdAt,
      updatedAt: this.updatedAtValue,
    };
  }
}

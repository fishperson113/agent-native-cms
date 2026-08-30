import type { ArticleRepository } from "@/modules/content/domain/article.repository";
import { loadArticle } from "@/modules/content/application/load-article";
import {
  articleId,
  articlePresentationId,
  tenantId,
} from "@/shared/kernel/identifiers";
import type { Clock } from "@/shared/kernel/ports/clock";
import type { IdGenerator } from "@/shared/kernel/ports/id-generator";

import type { PresentationCompiler } from "../ports/presentation-compiler";
import { toArticlePresentationDto, type ArticlePresentationDto } from "../article-presentation.dto";
import { PresentationCompilationError } from "../../domain/article-presentation.errors";
import type { ArticlePresentationRepository } from "../../domain/article-presentation.repository";
import { ArticlePresentation } from "../../domain/article-presentation";

export type UploadArticlePresentationCommand = {
  tenantId: string;
  articleId: string;
  sourceCode: string;
};

export type UploadArticlePresentationResult = {
  presentation: ArticlePresentationDto;
  warnings: string[];
  compileErrors: string[];
};

export class UploadArticlePresentationHandler {
  constructor(
    private readonly articleRepository: ArticleRepository,
    private readonly presentationRepository: ArticlePresentationRepository,
    private readonly compiler: PresentationCompiler,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(
    command: UploadArticlePresentationCommand,
  ): Promise<UploadArticlePresentationResult> {
    const ownerId = tenantId(command.tenantId);
    const targetArticleId = articleId(command.articleId);
    await loadArticle(this.articleRepository, ownerId, targetArticleId);

    const presentation = ArticlePresentation.create({
      id: articlePresentationId(this.idGenerator.generate()),
      tenantId: ownerId,
      articleId: targetArticleId,
      sourceCode: command.sourceCode,
      now: this.clock.now(),
    });

    try {
      const compiled = await this.compiler.compile(presentation.sourceCode);
      presentation.markCompiled(compiled.code, this.clock.now());
      await this.presentationRepository.save(presentation);
      return {
        presentation: toArticlePresentationDto(presentation),
        warnings: compiled.warnings,
        compileErrors: [],
      };
    } catch (error) {
      const compilationError =
        error instanceof PresentationCompilationError
          ? error
          : new PresentationCompilationError([
              "The compiler failed without structured diagnostics.",
            ]);
      presentation.markFailed(
        compilationError.diagnostics.join("\n"),
        this.clock.now(),
      );
      await this.presentationRepository.save(presentation);
      return {
        presentation: toArticlePresentationDto(presentation),
        warnings: [],
        compileErrors: compilationError.diagnostics,
      };
    }
  }
}

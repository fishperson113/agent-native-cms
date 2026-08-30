import { DomainError } from "@/shared/kernel/domain-error";

export class PresentationSourceRequiredError extends DomainError {
  readonly code = "PRESENTATION_SOURCE_REQUIRED";

  constructor() {
    super("Presentation source code is required.");
  }
}

export class CompiledPresentationRequiredError extends DomainError {
  readonly code = "COMPILED_PRESENTATION_REQUIRED";

  constructor() {
    super("Compiled presentation code is required.");
  }
}

export class PresentationNotCompiledError extends DomainError {
  readonly code = "PRESENTATION_NOT_COMPILED";

  constructor() {
    super("Only a compiled presentation can be activated.");
  }
}

export class PresentationFailureReasonRequiredError extends DomainError {
  readonly code = "PRESENTATION_FAILURE_REASON_REQUIRED";

  constructor() {
    super("A failure reason is required for a failed presentation.");
  }
}

export class PresentationNotFoundError extends DomainError {
  readonly code = "PRESENTATION_NOT_FOUND";

  constructor() {
    super("Article presentation not found.");
  }
}

export class PresentationArticleMismatchError extends DomainError {
  readonly code = "PRESENTATION_ARTICLE_MISMATCH";

  constructor() {
    super("Article presentation does not belong to the requested article.");
  }
}

export class PresentationCompilationError extends DomainError {
  readonly code = "PRESENTATION_COMPILATION_ERROR";

  constructor(
    readonly diagnostics: string[],
    message = "The presentation program could not be compiled.",
  ) {
    super(message);
  }
}

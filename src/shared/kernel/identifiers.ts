import { DomainError } from "./domain-error";

declare const brand: unique symbol;

type BrandedIdentifier<Name extends string> = string & {
  readonly [brand]: Name;
};

export type TenantId = BrandedIdentifier<"TenantId">;
export type ArticleId = BrandedIdentifier<"ArticleId">;
export type ArticlePresentationId = BrandedIdentifier<"ArticlePresentationId">;
export type McpCredentialId = BrandedIdentifier<"McpCredentialId">;

export class InvalidIdentifierError extends DomainError {
  readonly code = "INVALID_IDENTIFIER";

  constructor(kind: string, value: string) {
    super(`${kind} must be a valid UUID; received "${value}".`);
  }
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function identifier<Name extends string>(
  kind: Name,
  value: string,
): BrandedIdentifier<Name> {
  if (!uuidPattern.test(value)) {
    throw new InvalidIdentifierError(kind, value);
  }

  return value as BrandedIdentifier<Name>;
}

export const tenantId = (value: string): TenantId =>
  identifier("TenantId", value);

export const articleId = (value: string): ArticleId =>
  identifier("ArticleId", value);

export const articlePresentationId = (
  value: string,
): ArticlePresentationId => identifier("ArticlePresentationId", value);

export const mcpCredentialId = (value: string): McpCredentialId =>
  identifier("McpCredentialId", value);

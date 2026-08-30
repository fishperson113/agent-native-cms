export type GeneratedMcpKey = {
  plaintext: string;
  prefix: string;
};

export interface McpKeyService {
  generate(): GeneratedMcpKey;
  prefixFor(plaintext: string): string;
  hash(plaintext: string): Promise<string>;
  verify(plaintext: string, encodedHash: string): Promise<boolean>;
}

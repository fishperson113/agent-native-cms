import {
  createHash,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from "node:crypto";

import type {
  GeneratedMcpKey,
  McpKeyService,
} from "@/modules/access/application/mcp-key-service";

const generatedKeyPattern = /^(cms_[a-f0-9]{12})_[A-Za-z0-9_-]{43}$/;

function deriveKey(plaintext: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(plaintext, salt, 32, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

export class SecureMcpKeyService implements McpKeyService {
  generate(): GeneratedMcpKey {
    const prefix = `cms_${randomBytes(6).toString("hex")}`;
    return {
      prefix,
      plaintext: `${prefix}_${randomBytes(32).toString("base64url")}`,
    };
  }

  prefixFor(plaintext: string): string {
    const generated = generatedKeyPattern.exec(plaintext);
    if (generated) return generated[1];
    return `legacy_${createHash("sha256").update(plaintext).digest("hex").slice(0, 12)}`;
  }

  async hash(plaintext: string): Promise<string> {
    const salt = randomBytes(16);
    const derived = await deriveKey(plaintext, salt);
    return `scrypt$${salt.toString("base64url")}$${derived.toString("base64url")}`;
  }

  async verify(plaintext: string, encodedHash: string): Promise<boolean> {
    const [algorithm, saltText, hashText] = encodedHash.split("$");
    if (algorithm !== "scrypt" || !saltText || !hashText) return false;
    try {
      const expected = Buffer.from(hashText, "base64url");
      const actual = await deriveKey(
        plaintext,
        Buffer.from(saltText, "base64url"),
      );
      return (
        actual.length === expected.length && timingSafeEqual(actual, expected)
      );
    } catch {
      return false;
    }
  }
}

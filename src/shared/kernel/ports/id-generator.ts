import { randomUUID } from "node:crypto";

export interface IdGenerator {
  generate(): string;
}

export class UuidGenerator implements IdGenerator {
  generate(): string {
    return randomUUID();
  }
}

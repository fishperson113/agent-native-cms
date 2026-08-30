import { describe, expect, it } from "vitest";

import { parseEnvironment } from "./environment";

describe("parseEnvironment", () => {
  it("accepts a PostgreSQL connection URL", () => {
    expect(
      parseEnvironment({
        DATABASE_URL: "postgresql://user:password@localhost:5432/database",
      }),
    ).toEqual({
      DATABASE_URL: "postgresql://user:password@localhost:5432/database",
    });
  });

  it("rejects a missing database URL", () => {
    expect(() => parseEnvironment({})).toThrow();
  });

  it("rejects a non-PostgreSQL URL", () => {
    expect(() =>
      parseEnvironment({ DATABASE_URL: "https://example.com" }),
    ).toThrow();
  });
});

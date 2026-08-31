import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("tsconfig tsc-alias", () => {
  it("resolves full .js specifiers so Node ESM can load dist/", () => {
    const tsconfig = JSON.parse(readFileSync("tsconfig.json", "utf8"));
    expect(tsconfig["tsc-alias"]?.resolveFullPaths).toBe(true);
  });
});

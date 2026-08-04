import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { validateEnv } from "@/config/env";

describe("validateEnv", () => {
  const original = { ...process.env };

  beforeEach(() => {
    process.env = { ...original };
  });

  afterEach(() => {
    process.env = { ...original };
  });

  it("returns parsed config when required vars present", () => {
    process.env.DISCORD_TOKEN = "tok";
    process.env.DATABASE_URL = "file:./dev.db";
    process.env.BACKFILL = "true";
    process.env.BACKFILL_LIMIT = "5";

    const env = validateEnv();
    expect(env.DISCORD_TOKEN).toBe("tok");
    expect(env.DATABASE_URL).toBe("file:./dev.db");
    expect(env.BACKFILL).toBe(true);
    expect(env.BACKFILL_LIMIT).toBe(5);
  });

  it("defaults BACKFILL to false and BACKFILL_LIMIT to 50", () => {
    process.env.DISCORD_TOKEN = "tok";
    process.env.DATABASE_URL = "file:./dev.db";
    delete process.env.BACKFILL;
    delete process.env.BACKFILL_LIMIT;

    const env = validateEnv();
    expect(env.BACKFILL).toBe(false);
    expect(env.BACKFILL_LIMIT).toBe(50);
  });

  it("throws when DISCORD_TOKEN missing", () => {
    delete process.env.DISCORD_TOKEN;
    process.env.DATABASE_URL = "file:./dev.db";
    expect(() => validateEnv()).toThrow(/DISCORD_TOKEN/);
  });

  it("throws when DATABASE_URL missing", () => {
    process.env.DISCORD_TOKEN = "tok";
    delete process.env.DATABASE_URL;
    expect(() => validateEnv()).toThrow(/DATABASE_URL/);
  });
});

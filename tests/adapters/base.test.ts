import { describe, it, expect, afterEach } from "vitest";
import nock from "nock";
import { fetchJson } from "@/adapters/base";

describe("fetchJson", () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it("times out hung requests so one board cannot stall backfill", async () => {
    nock("https://example.test").get("/slow").delayConnection(400).reply(200, { ok: true });
    await expect(fetchJson("https://example.test/slow", { timeoutMs: 50 })).rejects.toThrow(/timed out/i);
  });
});

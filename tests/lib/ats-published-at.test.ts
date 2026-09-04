import { describe, it, expect, beforeEach, afterEach } from "vitest";
import nock from "nock";
import { resolveAtsPublishedAt } from "@/lib/ats-published-at";

describe("resolveAtsPublishedAt", () => {
  beforeEach(() => nock.cleanAll());
  afterEach(() => nock.cleanAll());

  it("reads first_published from a Greenhouse job URL", async () => {
    nock("https://boards-api.greenhouse.io")
      .get("/v1/boards/hpiq/jobs/6111955004")
      .reply(200, { first_published: "2026-08-31T15:24:19-04:00" });

    const posted = await resolveAtsPublishedAt(
      "https://job-boards.greenhouse.io/hpiq/jobs/6111955004"
    );

    expect(posted?.toISOString()).toBe("2026-08-31T19:24:19.000Z");
  });

  it("returns null for non-ATS URLs and failed fetches", async () => {
    expect(await resolveAtsPublishedAt("https://simplify.jobs/p/abc")).toBeNull();

    nock("https://boards-api.greenhouse.io")
      .get("/v1/boards/hpiq/jobs/1")
      .reply(404);

    expect(
      await resolveAtsPublishedAt("https://boards.greenhouse.io/hpiq/jobs/1")
    ).toBeNull();
  });
});

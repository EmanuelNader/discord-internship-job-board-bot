import { describe, it, expect, beforeEach } from "vitest";
import nock from "nock";
import { createLeverAdapter } from "@/adapters/lever";

function nockLeverEmpty() {
  nock("https://api.lever.co")
    .persist()
    .get(/\/v0\/postings\/.+/)
    .query({ mode: "json" })
    .reply(200, []);
}

describe("Lever Adapter", () => {
  const adapter = createLeverAdapter();

  beforeEach(() => nock.cleanAll());

  it("fetches jobs from a bare Lever postings array", async () => {
    nock("https://api.lever.co")
      .get("/v0/postings/palantir")
      .query({ mode: "json" })
      .reply(200, [
        {
          id: "lever_123",
          text: "Frontend Engineer Intern",
          categories: { location: "New York, NY", team: "Engineering" },
          applyUrl: "https://jobs.lever.co/palantir/lever_123",
          hostedUrl: "https://jobs.lever.co/palantir/lever_123",
          createdAt: 1717200000000,
        },
      ]);
    nockLeverEmpty();

    const postings = await adapter.fetchNewPostings();
    expect(postings).toHaveLength(1);
    expect(postings[0]).toMatchObject({
      title: "Frontend Engineer Intern",
      company: "Palantir",
      externalId: "lever_123",
      url: "https://jobs.lever.co/palantir/lever_123",
    });
  });

  it("isolates a single company failure", async () => {
    nock("https://api.lever.co")
      .get("/v0/postings/palantir")
      .query({ mode: "json" })
      .replyWithError("ECONNREFUSED");
    nockLeverEmpty();

    const postings = await adapter.fetchNewPostings();
    expect(postings).toHaveLength(0);
  });

  it("throws AdapterError when every company fails", async () => {
    nock("https://api.lever.co")
      .persist()
      .get(/\/v0\/postings\/.+/)
      .query({ mode: "json" })
      .replyWithError("ECONNREFUSED");

    await expect(adapter.fetchNewPostings()).rejects.toThrow(/lever/i);
  });
});

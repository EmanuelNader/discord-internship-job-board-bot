import { describe, it, expect, beforeEach } from "vitest";
import nock from "nock";
import { createAshbyAdapter } from "@/adapters/ashby";

function nockAshbyEmpty() {
  nock("https://api.ashbyhq.com")
    .persist()
    .get(/\/posting-api\/job-board\/.+/)
    .reply(200, { jobs: [] });
}

describe("Ashby Adapter", () => {
  const adapter = createAshbyAdapter();

  beforeEach(() => nock.cleanAll());

  it("fetches jobs from the Ashby posting API", async () => {
    nock("https://api.ashbyhq.com")
      .get("/posting-api/job-board/chalk")
      .reply(200, {
        jobs: [
          {
            id: "ashby_123",
            title: "Product Manager Intern",
            location: "San Francisco, CA",
            jobUrl: "https://jobs.ashbyhq.com/chalk/ashby_123",
            publishedAt: "2026-06-01T12:00:00.000Z",
            isListed: true,
          },
        ],
      });
    nockAshbyEmpty();

    const postings = await adapter.fetchNewPostings();
    expect(postings).toHaveLength(1);
    expect(postings[0]).toMatchObject({
      title: "Product Manager Intern",
      company: "Chalk",
      externalId: "ashby_123",
      url: "https://jobs.ashbyhq.com/chalk/ashby_123",
      publishedAt: "2026-06-01T12:00:00.000Z",
    });
  });

  it("isolates a single company failure", async () => {
    nock("https://api.ashbyhq.com")
      .get("/posting-api/job-board/chalk")
      .replyWithError("ECONNREFUSED");
    nockAshbyEmpty();

    const postings = await adapter.fetchNewPostings();
    expect(postings).toHaveLength(0);
  });

  it("throws AdapterError when every company fails", async () => {
    nock("https://api.ashbyhq.com")
      .persist()
      .get(/\/posting-api\/job-board\/.+/)
      .replyWithError("ECONNREFUSED");

    await expect(adapter.fetchNewPostings()).rejects.toThrow(/ashby/i);
  });
});

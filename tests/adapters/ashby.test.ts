import { describe, it, expect, beforeEach } from "vitest";
import nock from "nock";
import { createAshbyAdapter } from "@/adapters/ashby";

describe("Ashby Adapter", () => {
  const adapter = createAshbyAdapter();

  beforeEach(() => nock.cleanAll());

  it("fetches jobs from Ashby API", async () => {
    const fixture = {
      jobs: [
        {
          id: "ashby_123",
          title: "Product Manager Intern",
          location: "San Francisco, CA",
          jobUrl: "https://jobs.ashbyhq.com/stripe/ashby_123",
          department: "Product",
        },
      ],
    };

    nock("https://jobs.ashbyhq.com")
      .get("/stripe")
      .reply(200, fixture);
    nock("https://jobs.ashbyhq.com")
      .get("/airbnb")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/coinbase")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/databricks")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/notion")
      .reply(200, { jobs: [] });

    const postings = await adapter.fetchNewPostings();
    expect(postings).toHaveLength(1);
    expect(postings[0]).toMatchObject({
      title: "Product Manager Intern",
      company: "Stripe",
      externalId: "ashby_123",
      url: "https://jobs.ashbyhq.com/stripe/ashby_123",
    });
  });

  it("throws AdapterError on network failure", async () => {
    nock("https://jobs.ashbyhq.com")
      .get("/stripe")
      .replyWithError("ECONNREFUSED");
    nock("https://jobs.ashbyhq.com")
      .get("/airbnb")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/coinbase")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/databricks")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/notion")
      .reply(200, { jobs: [] });

    await expect(adapter.fetchNewPostings()).rejects.toThrow(/ashby/i);
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import nock from "nock";
import { createLeverAdapter } from "@/adapters/lever";

describe("Lever Adapter", () => {
  const adapter = createLeverAdapter();

  beforeEach(() => nock.cleanAll());

  it("fetches jobs from Lever JSON", async () => {
    const fixture = {
      postings: [
        {
          id: "lever_123",
          text: "Frontend Engineer Intern",
          categories: { location: "New York, NY", team: "Engineering" },
          applyUrl: "https://jobs.lever.co/shopify/lever_123",
          hostedUrl: "https://jobs.lever.co/shopify/lever_123",
        },
      ],
    };

    nock("https://api.lever.co")
      .get("/v0/postings/shopify")
      .query({ mode: "json" })
      .reply(200, fixture);
    nock("https://api.lever.co")
      .get("/v0/postings/discord")
      .query({ mode: "json" })
      .reply(200, { postings: [] });
    nock("https://api.lever.co")
      .get("/v0/postings/figma")
      .query({ mode: "json" })
      .reply(200, { postings: [] });
    nock("https://api.lever.co")
      .get("/v0/postings/linear")
      .query({ mode: "json" })
      .reply(200, { postings: [] });
    nock("https://api.lever.co")
      .get("/v0/postings/vercel")
      .query({ mode: "json" })
      .reply(200, { postings: [] });

    const postings = await adapter.fetchNewPostings();
    expect(postings).toHaveLength(1);
    expect(postings[0]).toMatchObject({
      title: "Frontend Engineer Intern",
      company: "Shopify",
      externalId: "lever_123",
      url: "https://jobs.lever.co/shopify/lever_123",
    });
  });

  it("throws AdapterError on network failure", async () => {
    nock("https://api.lever.co")
      .get("/v0/postings/shopify")
      .query({ mode: "json" })
      .replyWithError("ECONNREFUSED");

    await expect(adapter.fetchNewPostings()).rejects.toThrow(/lever/i);
  });
});

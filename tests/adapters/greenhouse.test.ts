import { describe, it, expect, beforeEach } from "vitest";
import nock from "nock";
import { createGreenhouseAdapter } from "@/adapters/greenhouse";

const OTHER_COMPANIES = [
  "andurilindustries", "airtable", "airbnb", "fireworksai", "figma", "twitch", "neuralink",
  "robinhood", "xai", "anthropic", "reddit", "cloudflare", "scaleai", "lyft",
  "stripe", "discord", "brex", "squarespace", "clear", "affirm",
  "crunchyroll", "nuro", "pallet", "pinterest", "astranis", "waymo", "figureai", "merge",
  "databricks", "datadog", "dropbox", "instacart", "mongodb", "twilio", "block",
  "gitlab", "vercel", "thinkingmachines", "togetherai", "hightouch", "roblox",
  "jumptrading", "akunacapital", "optiver", "imc", "chicagotrading",
  "coinbase", "snap", "uber"
];
const EMPTY_BODY = { jobs: [], meta: { total: 0 } };

describe("Greenhouse Adapter", () => {
  const adapter = createGreenhouseAdapter();

  beforeEach(() => {
    nock.cleanAll();
    // Stub the non-target companies in the config so the adapter's loop is deterministic.
    for (const company of OTHER_COMPANIES) {
      nock("https://boards-api.greenhouse.io")
        .get(`/v1/boards/${company}/jobs`)
        .query({ content: "Job" })
        .reply(200, EMPTY_BODY);
    }
  });

  it("fetches and parses jobs from Greenhouse boards API", async () => {
    const fixture = {
      jobs: [
        {
          id: 123,
          title: "Software Engineer Intern",
          location: { name: "Mountain View, CA" },
          absolute_url: "https://boards.greenhouse.io/spacex/jobs/123",
          company_name: "SpaceX",
          first_published: "2026-06-15T10:00:00-04:00",
        },
        {
          id: 456,
          title: "Senior Software Engineer",
          location: { name: "New York, NY" },
          absolute_url: "https://boards.greenhouse.io/spacex/jobs/456",
          company_name: "SpaceX",
          first_published: "2026-06-20T10:00:00-04:00",
        },
      ],
      meta: { total: 2 },
    };

    nock("https://boards-api.greenhouse.io")
      .get("/v1/boards/spacex/jobs")
      .query({ content: "Job" })
      .reply(200, fixture);

    const postings = await adapter.fetchNewPostings();
    expect(postings).toHaveLength(2);
    expect(postings[0]).toMatchObject({
      title: "Software Engineer Intern",
      company: "SpaceX",
      externalId: "123",
      url: "https://boards.greenhouse.io/spacex/jobs/123",
      publishedAt: "2026-06-15T10:00:00-04:00",
    });
    expect(postings[1].title).toBe("Senior Software Engineer");
    expect(postings[1].publishedAt).toBe("2026-06-20T10:00:00-04:00");
  });

  it("handles empty response", async () => {
    nock("https://boards-api.greenhouse.io")
      .get("/v1/boards/spacex/jobs")
      .query({ content: "Job" })
      .reply(200, { jobs: [], meta: { total: 0 } });

    const postings = await adapter.fetchNewPostings();
    expect(postings).toHaveLength(0);
  });

  it("handles HTTP error gracefully", async () => {
    nock("https://boards-api.greenhouse.io")
      .get("/v1/boards/spacex/jobs")
      .query({ content: "Job" })
      .reply(500);

    await expect(adapter.fetchNewPostings()).rejects.toThrow();
  });
});

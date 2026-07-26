import { describe, it, expect, beforeEach } from "vitest";
import nock from "nock";
import { createGreenhouseAdapter } from "@/adapters/greenhouse";

const OTHER_COMPANIES = ["microsoft", "amazon", "meta", "apple"];
const EMPTY_BODY = { jobs: [] };

describe("Greenhouse Adapter", () => {
  const adapter = createGreenhouseAdapter();

  beforeEach(() => {
    nock.cleanAll();
    nock.disableNetConnect();
    // Stub the non-target companies in the config so the adapter's loop is deterministic.
    for (const company of OTHER_COMPANIES) {
      nock("https://boards.greenhouse.io")
        .get(`/${company}/embed/jobboard`)
        .query({ content: "Job", method: "json" })
        .reply(200, EMPTY_BODY);
    }
  });

  it("fetches and parses jobs from Greenhouse embed JSON", async () => {
    const fixture = {
      jobs: [
        {
          id: "gh_123",
          title: "Software Engineer Intern",
          location: { name: "Mountain View, CA" },
          absolute_url: "https://boards.greenhouse.io/google/jobs/gh_123",
          metadata: [{ name: "Department", value: "Engineering" }],
        },
        {
          id: "gh_456",
          title: "Senior Software Engineer", // should be dropped by detectLevel
          location: { name: "New York, NY" },
          absolute_url: "https://boards.greenhouse.io/google/jobs/gh_456",
        },
      ],
    };

    nock("https://boards.greenhouse.io")
      .get("/google/embed/jobboard")
      .query({ content: "Job", method: "json" })
      .reply(200, fixture);

    const postings = await adapter.fetchNewPostings();
    expect(postings).toHaveLength(2); // both raw postings returned; filtering happens in scheduler
    expect(postings[0]).toMatchObject({
      title: "Software Engineer Intern",
      company: "Google",
      externalId: "gh_123",
      url: "https://boards.greenhouse.io/google/jobs/gh_123",
    });
    expect(postings[1].title).toBe("Senior Software Engineer");
  });

  it("handles pagination (next page)", async () => {
    const page1 = { jobs: [{ id: "1", title: "Intern 1", location: { name: "SF" }, absolute_url: "http://x/1" }], next: "page=2" };
    const page2 = { jobs: [{ id: "2", title: "Intern 2", location: { name: "NYC" }, absolute_url: "http://x/2" }] };

    nock("https://boards.greenhouse.io")
      .get("/google/embed/jobboard")
      .query({ content: "Job", method: "json" })
      .reply(200, page1);

    nock("https://boards.greenhouse.io")
      .get("/google/embed/jobboard")
      .query({ content: "Job", method: "json", page: "2" })
      .reply(200, page2);

    const postings = await adapter.fetchNewPostings();
    expect(postings).toHaveLength(2);
  });

  it("handles empty response", async () => {
    nock("https://boards.greenhouse.io")
      .get("/google/embed/jobboard")
      .query({ content: "Job", method: "json" })
      .reply(200, { jobs: [] });

    const postings = await adapter.fetchNewPostings();
    expect(postings).toHaveLength(0);
  });

  it("handles HTTP error gracefully", async () => {
    nock("https://boards.greenhouse.io")
      .get("/google/embed/jobboard")
      .query({ content: "Job", method: "json" })
      .reply(500);

    await expect(adapter.fetchNewPostings()).rejects.toThrow();
  });
});

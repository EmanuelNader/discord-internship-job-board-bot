import { describe, it, expect, beforeEach } from "vitest";
import nock from "nock";
import { createGithubAdapter } from "@/adapters/github";

describe("GitHub Adapter", () => {
  const adapter = createGithubAdapter();

  beforeEach(() => nock.cleanAll());

  it("fetches issues from curated repos", async () => {
    nock("https://api.github.com")
      .get("/repos/SimplifyJobs/Summer2026-Internships/issues")
      .query({ state: "open", per_page: "100" })
      .reply(200, [
        { number: 1, title: "[SWE] Google - Software Engineer Intern", html_url: "https://github.com/SimplifyJobs/Summer2026-Internships/issues/1", body: "Company: Google\nRole: Software Engineer Intern\nLocation: Mountain View, CA\nLink: https://careers.google.com/jobs/123" },
      ]);

    nock("https://api.github.com")
      .get("/repos/pittcsc/PittCSWindow/issues")
      .query({ state: "open", per_page: "100" })
      .reply(200, [
        { number: 1, title: "[Data] Meta - Data Scientist Intern", html_url: "https://github.com/pittcsc/PittCSWindow/issues/1", body: "Company: Meta\nRole: Data Scientist Intern\nLocation: Menlo Park, CA\nLink: https://careers.meta.com/jobs/456" },
      ]);

    const postings = await adapter.fetchNewPostings();
    expect(postings).toHaveLength(2);
    expect(postings[0].externalId).toBe("SimplifyJobs/Summer2026-Internships-1");
    expect(postings[1].externalId).toBe("pittcsc/PittCSWindow-1");
  });

  it("parses issue body for structured fields", async () => {
    nock("https://api.github.com")
      .get("/repos/SimplifyJobs/Summer2026-Internships/issues")
      .query({ state: "open", per_page: "100" })
      .reply(200, [
        { number: 42, title: "[SWE] Test Corp - Backend Intern", html_url: "https://github.com/SimplifyJobs/Summer2026-Internships/issues/42", body: "Company: Test Corp\nRole: Backend Intern\nLocation: Remote\nLink: https://testcorp.com/jobs/42" },
      ]);

    nock("https://api.github.com")
      .get("/repos/pittcsc/PittCSWindow/issues")
      .query({ state: "open", per_page: "100" })
      .reply(200, []);

    const postings = await adapter.fetchNewPostings();
    expect(postings[0].company).toBe("Test Corp");
    expect(postings[0].location).toBe("Remote");
    expect(postings[0].url).toBe("https://testcorp.com/jobs/42");
  });

  it("throws AdapterError on network failure", async () => {
    nock("https://api.github.com")
      .get("/repos/SimplifyJobs/Summer2026-Internships/issues")
      .query({ state: "open", per_page: "100" })
      .replyWithError("ECONNREFUSED");

    await expect(adapter.fetchNewPostings()).rejects.toThrow(/github/i);
  });
});

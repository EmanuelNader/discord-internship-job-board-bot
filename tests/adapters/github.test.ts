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
        { number: 1, title: "[SWE] Google - Software Engineer Intern", html_url: "https://github.com/SimplifyJobs/Summer2026-Internships/issues/1", body: "Company: Google\nRole: Software Engineer Intern\nLocation: Mountain View, CA\nLink: https://careers.google.com/jobs/123", created_at: "2026-06-01T12:00:00Z" },
      ]);

    nock("https://api.github.com")
      .get("/repos/vanshb03/Summer2027-Internships/issues")
      .query({ state: "open", per_page: "100" })
      .reply(200, [
        { number: 2, title: "[SWE] Meta - Software Engineer Intern", html_url: "https://github.com/vanshb03/Summer2027-Internships/issues/2", body: "Company: Meta\nRole: Software Engineer Intern\nLocation: Menlo Park, CA\nLink: https://careers.meta.com/jobs/456", created_at: "2026-06-02T12:00:00Z" },
      ]);

    nock("https://api.github.com")
      .get("/repos/speedyapply/2027-SWE-College-Jobs/issues")
      .query({ state: "open", per_page: "100" })
      .reply(200, [
        { number: 3, title: "[Data] Netflix - Data Scientist Intern", html_url: "https://github.com/speedyapply/2027-SWE-College-Jobs/issues/3", body: "Company: Netflix\nRole: Data Scientist Intern\nLocation: Los Gatos, CA\nLink: https://jobs.netflix.com/789", created_at: "2026-06-03T12:00:00Z" },
      ]);

    const postings = await adapter.fetchNewPostings();
    expect(postings).toHaveLength(3);
    expect(postings[0].externalId).toBe("SimplifyJobs/Summer2026-Internships-1");
    expect(postings[0].publishedAt).toBe("2026-06-01T12:00:00Z");
    expect(postings[1].externalId).toBe("vanshb03/Summer2027-Internships-2");
    expect(postings[1].publishedAt).toBe("2026-06-02T12:00:00Z");
    expect(postings[2].externalId).toBe("speedyapply/2027-SWE-College-Jobs-3");
    expect(postings[2].publishedAt).toBe("2026-06-03T12:00:00Z");
  });

  it("parses issue body for structured fields", async () => {
    nock("https://api.github.com")
      .get("/repos/SimplifyJobs/Summer2026-Internships/issues")
      .query({ state: "open", per_page: "100" })
      .reply(200, [
        { number: 42, title: "[SWE] Test Corp - Backend Intern", html_url: "https://github.com/SimplifyJobs/Summer2026-Internships/issues/42", body: "Company: Test Corp\nRole: Backend Intern\nLocation: Remote\nLink: https://testcorp.com/jobs/42", created_at: "2026-06-04T12:00:00Z" },
      ]);

    nock("https://api.github.com")
      .get("/repos/vanshb03/Summer2027-Internships/issues")
      .query({ state: "open", per_page: "100" })
      .reply(200, []);

    nock("https://api.github.com")
      .get("/repos/speedyapply/2027-SWE-College-Jobs/issues")
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
    nock("https://api.github.com")
      .get("/repos/vanshb03/Summer2027-Internships/issues")
      .query({ state: "open", per_page: "100" })
      .reply(200, []);
    nock("https://api.github.com")
      .get("/repos/speedyapply/2027-SWE-College-Jobs/issues")
      .query({ state: "open", per_page: "100" })
      .reply(200, []);

    await expect(adapter.fetchNewPostings()).rejects.toThrow(/github/i);
  });
});

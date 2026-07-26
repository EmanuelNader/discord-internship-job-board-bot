import { describe, it, expect, beforeEach } from "vitest";
import nock from "nock";
import { createSimplifyAdapter } from "@/adapters/simplify";

describe("Simplify Adapter", () => {
  const adapter = createSimplifyAdapter();

  beforeEach(() => nock.cleanAll());

  it("returns empty when no companies configured", async () => {
    const postings = await adapter.fetchNewPostings();
    expect(postings).toHaveLength(0);
  });

  it("parses HTML job board for a company", async () => {
    nock("https://simplify.jobs")
      .get("/companies/google")
      .reply(200, `
        <html><body>
          <div class="job-list">
            <a class="job-link" href="/jobs/google/123">
              <h3>Software Engineer Intern</h3>
              <span class="location">Mountain View, CA</span>
            </a>
            <a class="job-link" href="/jobs/google/456">
              <h3>Data Science Intern</h3>
              <span class="location">Seattle, WA</span>
            </a>
          </div>
        </body></html>
      `);

    const adapterWithConfig = createSimplifyAdapter(["google"]);
    const postings = await adapterWithConfig.fetchNewPostings();
    expect(postings).toHaveLength(2);
    expect(postings[0].title).toBe("Software Engineer Intern");
    expect(postings[0].externalId).toBe("google-123");
    expect(postings[1].title).toBe("Data Science Intern");
    expect(postings[1].externalId).toBe("google-456");
  });

  it("throws AdapterError on network failure", async () => {
    nock("https://simplify.jobs")
      .get("/companies/google")
      .replyWithError("ECONNREFUSED");

    const adapterWithConfig = createSimplifyAdapter(["google"]);
    await expect(adapterWithConfig.fetchNewPostings()).rejects.toThrow(/simplify/i);
  });
});

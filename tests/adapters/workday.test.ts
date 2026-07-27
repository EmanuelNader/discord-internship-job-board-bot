import { describe, it, expect, beforeEach } from "vitest";
import nock from "nock";
import { createWorkdayAdapter } from "@/adapters/workday";

describe("Workday Adapter", () => {
  const adapter = createWorkdayAdapter();

  beforeEach(() => nock.cleanAll());

  it("fetches jobs from Workday paginated JSON", async () => {
    const page1 = {
      jobPostings: [
        { jobId: "wd_123", title: "Hardware Engineering Intern", locationsText: "Santa Clara, CA", externalPath: "/en-US/job/wd_123" },
      ],
      total: 2,
      page: 1,
      pageSize: 1,
    };
    const page2 = {
      jobPostings: [
        { jobId: "wd_456", title: "ASIC Verification Intern", locationsText: "Portland, OR", externalPath: "/en-US/job/wd_456" },
      ],
      total: 2,
      page: 2,
      pageSize: 1,
    };

    nock("https://adobe.wd1.myworkdayjobs.com")
      .post("/wd1/adobe/careers")
      .reply(200, page1);

    nock("https://adobe.wd1.myworkdayjobs.com")
      .post("/wd1/adobe/careers")
      .reply(200, page2);

    for (const co of ["nvidia", "expedia", "turo", "blue-origin", "salesforce", "general-motors", "disney", "slack", "capital-one", "paypal"]) {
      nock(`https://${co}.wd1.myworkdayjobs.com`)
        .post(`/wd1/${co}/careers`)
        .reply(200, { jobPostings: [], total: 0, page: 1, pageSize: 20 });
    }

    const postings = await adapter.fetchNewPostings();
    expect(postings).toHaveLength(2);
    expect(postings[0].externalId).toBe("wd_123");
    expect(postings[1].externalId).toBe("wd_456");
  });

  it("throws AdapterError on network failure", async () => {
    nock("https://adobe.wd1.myworkdayjobs.com")
      .post("/wd1/adobe/careers")
      .replyWithError("ECONNREFUSED");

    for (const co of ["nvidia", "expedia", "turo", "blue-origin", "salesforce", "general-motors", "disney", "slack", "capital-one", "paypal"]) {
      nock(`https://${co}.wd1.myworkdayjobs.com`)
        .post(`/wd1/${co}/careers`)
        .reply(200, { jobPostings: [], total: 0, page: 1, pageSize: 20 });
    }

    await expect(adapter.fetchNewPostings()).rejects.toThrow(/workday/i);
  });
});

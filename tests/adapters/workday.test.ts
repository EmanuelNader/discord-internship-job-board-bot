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

    nock("https://nvidia.wd1.myworkdayjobs.com")
      .post("/wd1/nvidia/careers")
      .reply(200, page1);

    nock("https://nvidia.wd1.myworkdayjobs.com")
      .post("/wd1/nvidia/careers")
      .reply(200, page2);

    nock("https://intel.wd1.myworkdayjobs.com")
      .post("/wd1/intel/careers")
      .reply(200, { jobPostings: [], total: 0, page: 1, pageSize: 20 });
    nock("https://amd.wd1.myworkdayjobs.com")
      .post("/wd1/amd/careers")
      .reply(200, { jobPostings: [], total: 0, page: 1, pageSize: 20 });
    nock("https://qualcomm.wd1.myworkdayjobs.com")
      .post("/wd1/qualcomm/careers")
      .reply(200, { jobPostings: [], total: 0, page: 1, pageSize: 20 });
    nock("https://salesforce.wd1.myworkdayjobs.com")
      .post("/wd1/salesforce/careers")
      .reply(200, { jobPostings: [], total: 0, page: 1, pageSize: 20 });

    const postings = await adapter.fetchNewPostings();
    expect(postings).toHaveLength(2);
    expect(postings[0].externalId).toBe("wd_123");
    expect(postings[1].externalId).toBe("wd_456");
  });

  it("throws AdapterError on network failure", async () => {
    nock("https://nvidia.wd1.myworkdayjobs.com")
      .post("/wd1/nvidia/careers")
      .replyWithError("ECONNREFUSED");
    nock("https://intel.wd1.myworkdayjobs.com")
      .post("/wd1/intel/careers")
      .reply(200, { jobPostings: [], total: 0, page: 1, pageSize: 20 });
    nock("https://amd.wd1.myworkdayjobs.com")
      .post("/wd1/amd/careers")
      .reply(200, { jobPostings: [], total: 0, page: 1, pageSize: 20 });
    nock("https://qualcomm.wd1.myworkdayjobs.com")
      .post("/wd1/qualcomm/careers")
      .reply(200, { jobPostings: [], total: 0, page: 1, pageSize: 20 });
    nock("https://salesforce.wd1.myworkdayjobs.com")
      .post("/wd1/salesforce/careers")
      .reply(200, { jobPostings: [], total: 0, page: 1, pageSize: 20 });

    await expect(adapter.fetchNewPostings()).rejects.toThrow(/workday/i);
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import nock from "nock";
import { createWorkdayAdapter } from "@/adapters/workday";
import { adapterConfigs } from "@/config/adapters.config";

const boards = adapterConfigs.find((c) => c.name === "workday")!.workdayBoards!;

function cxsPath(board: (typeof boards)[number]) {
  return `/wday/cxs/${board.tenant}/${board.site}/jobs`;
}

function nockWorkdayEmpty(exceptHostSite: string[] = []) {
  for (const board of boards) {
    const key = `${board.host}/${board.site}`;
    if (exceptHostSite.includes(key)) continue;
    nock(`https://${board.host}`)
      .post(cxsPath(board))
      .reply(200, { jobPostings: [], total: 0 });
  }
}

describe("Workday Adapter", () => {
  const adapter = createWorkdayAdapter();
  const nvidia = boards.find((b) => b.name === "NVIDIA")!;

  beforeEach(() => nock.cleanAll());

  it("fetches jobs from Workday CXS JSON", async () => {
    const page1 = {
      jobPostings: [
        {
          title: "Hardware Engineering Intern",
          locationsText: "Santa Clara, CA",
          externalPath: "/job/Hardware-Engineering-Intern_JR123",
          bulletFields: ["JR123"],
        },
      ],
      total: 2,
    };
    const page2 = {
      jobPostings: [
        {
          title: "ASIC Verification Intern",
          locationsText: "Portland, OR",
          externalPath: "/job/ASIC-Verification-Intern_JR456",
          bulletFields: ["JR456"],
        },
      ],
      total: 2,
    };

    nock(`https://${nvidia.host}`).post(cxsPath(nvidia)).reply(200, page1);
    nock(`https://${nvidia.host}`).post(cxsPath(nvidia)).reply(200, page2);
    nockWorkdayEmpty([`${nvidia.host}/${nvidia.site}`]);

    const postings = await adapter.fetchNewPostings();
    expect(postings).toHaveLength(2);
    expect(postings[0].externalId).toBe("JR123");
    expect(postings[0].url).toBe(
      `https://${nvidia.host}/${nvidia.site}/job/Hardware-Engineering-Intern_JR123`
    );
    expect(postings[1].externalId).toBe("JR456");
  });

  it("isolates a single board failure", async () => {
    nock(`https://${nvidia.host}`).post(cxsPath(nvidia)).replyWithError("ECONNREFUSED");
    nockWorkdayEmpty([`${nvidia.host}/${nvidia.site}`]);

    const postings = await adapter.fetchNewPostings();
    expect(postings).toHaveLength(0);
  });

  it("throws AdapterError when every board fails", async () => {
    for (const board of boards) {
      nock(`https://${board.host}`).post(cxsPath(board)).replyWithError("ECONNREFUSED");
    }

    await expect(adapter.fetchNewPostings()).rejects.toThrow(/workday/i);
  });
});

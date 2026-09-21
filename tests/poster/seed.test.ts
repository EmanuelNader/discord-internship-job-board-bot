import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindManyMap = vi.hoisted(() => vi.fn());
const mockFindManyPosting = vi.hoisted(() => vi.fn());

vi.mock("@/db/client", () => ({
  prisma: {
    channelMap: { findMany: mockFindManyMap },
    posting: { findMany: mockFindManyPosting },
  },
}));

import { seedRecentPostings } from "@/poster/seed";

describe("seedRecentPostings", () => {
  const send = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    send.mockResolvedValue(undefined);
  });

  it("sends recent jobs that were never delivered to the current channel map", async () => {
    mockFindManyMap.mockResolvedValue([{ kind: "job", roleFamily: "swe", channelId: "theta_swe" }]);
    mockFindManyPosting.mockResolvedValue([
      {
        dedupHash: "h1",
        title: "SWE Intern",
        company: "Acme",
        location: "SF",
        url: "https://a.com",
        level: "internship",
        sourceName: "greenhouse",
        roleFamily: JSON.stringify(["swe"]),
        roleTitles: JSON.stringify(["swe-frontend"]),
        publishedAt: new Date("2026-09-18"),
        channelIds: JSON.stringify(["old_ay_channel"]),
      },
    ]);

    const result = await seedRecentPostings(send, new Date("2026-09-14"));

    expect(result).toEqual({ sent: 1, skipped: 0 });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ title: "SWE Intern", company: "Acme" }),
      "h1"
    );
  });

  it("skips jobs already delivered to a mapped channel", async () => {
    mockFindManyMap.mockResolvedValue([{ kind: "job", roleFamily: "swe", channelId: "theta_swe" }]);
    mockFindManyPosting.mockResolvedValue([
      {
        dedupHash: "h1",
        title: "SWE Intern",
        company: "Acme",
        location: "SF",
        url: "https://a.com",
        level: "internship",
        sourceName: "greenhouse",
        roleFamily: JSON.stringify(["swe"]),
        roleTitles: JSON.stringify(["swe-frontend"]),
        publishedAt: new Date("2026-09-18"),
        channelIds: JSON.stringify(["theta_swe"]),
      },
    ]);

    const result = await seedRecentPostings(send, new Date("2026-09-14"));

    expect(result).toEqual({ sent: 0, skipped: 1 });
    expect(send).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindManyMap = vi.hoisted(() => vi.fn());
const mockFindManyPosting = vi.hoisted(() => vi.fn());
const mockPostingUpdate = vi.hoisted(() => vi.fn());

vi.mock("@/db/client", () => ({
  prisma: {
    channelMap: { findMany: mockFindManyMap },
    posting: { findMany: mockFindManyPosting, update: mockPostingUpdate },
  },
}));

import { seedRecentPostings } from "@/poster/seed";

describe("seedRecentPostings", () => {
  const send = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    send.mockResolvedValue(undefined);
  });

  it("sends club-major jobs that were never delivered to the current channel map", async () => {
    mockFindManyMap.mockResolvedValue([{ kind: "job", roleFamily: "chemical", channelId: "theta_chem" }]);
    mockFindManyPosting.mockResolvedValue([
      {
        dedupHash: "h1",
        title: "Chemical Engineering Intern",
        company: "Motiva",
        location: "Port Arthur, TX",
        url: "https://a.com",
        level: "internship",
        sourceName: "workday",
        roleFamily: JSON.stringify(["chemical"]),
        roleTitles: JSON.stringify(["eng-chemical"]),
        publishedAt: new Date("2026-08-23"),
        channelIds: JSON.stringify(["old_ay_channel"]),
      },
    ]);

    const result = await seedRecentPostings(send, new Date("2026-09-14"));

    expect(result).toEqual({ sent: 1, skipped: 0 });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Chemical Engineering Intern", company: "Motiva" }),
      "h1"
    );
  });

  it("skips jobs already delivered to a mapped channel", async () => {
    mockFindManyMap.mockResolvedValue([{ kind: "job", roleFamily: "chemical", channelId: "theta_chem" }]);
    mockFindManyPosting.mockResolvedValue([
      {
        dedupHash: "h1",
        title: "Chemical Engineering Intern",
        company: "Acme",
        location: "SF",
        url: "https://a.com",
        level: "internship",
        sourceName: "workday",
        roleFamily: JSON.stringify(["chemical"]),
        roleTitles: JSON.stringify(["eng-chemical"]),
        publishedAt: new Date("2026-09-18"),
        channelIds: JSON.stringify(["theta_chem"]),
      },
    ]);

    const result = await seedRecentPostings(send, new Date("2026-09-14"));

    expect(result).toEqual({ sent: 0, skipped: 1 });
    expect(send).not.toHaveBeenCalled();
  });

  it("sends undated Workday club internships that never reached Discord", async () => {
    mockFindManyMap.mockResolvedValue([{ kind: "job", roleFamily: "aerospace", channelId: "theta_aero" }]);
    mockFindManyPosting.mockResolvedValue([
      {
        dedupHash: "wd1",
        title: "Systems Engineering Intern - Mechanical/Aerospace Engineering",
        company: "GE Aerospace",
        location: "Dayton, OH",
        url: "https://workday.example/job",
        level: "internship",
        sourceName: "workday",
        roleFamily: JSON.stringify(["aerospace"]),
        roleTitles: JSON.stringify(["eng-aerospace"]),
        publishedAt: null,
        firstSeenAt: new Date("2026-09-21"),
        channelIds: null,
      },
    ]);

    const result = await seedRecentPostings(send, new Date("2026-09-14"));

    expect(result).toEqual({ sent: 1, skipped: 0 });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Systems Engineering Intern - Mechanical/Aerospace Engineering",
        company: "GE Aerospace",
      }),
      "wd1"
    );
  });

  it("skips leftover mechanical/electrical engineering and Canada listings", async () => {
    mockFindManyMap.mockResolvedValue([
      { kind: "job", roleFamily: "aerospace", channelId: "theta_aero" },
      { kind: "job", roleFamily: "electrical", channelId: "theta_ee" },
    ]);
    mockFindManyPosting.mockResolvedValue([
      {
        dedupHash: "ee",
        title: "Electrical Engineer Intern",
        company: "RTX",
        location: "Tucson, AZ",
        url: "https://a.com/ee",
        level: "internship",
        sourceName: "workday",
        roleFamily: JSON.stringify(["engineering"]),
        roleTitles: JSON.stringify(["eng-electrical"]),
        publishedAt: new Date("2026-09-18"),
        firstSeenAt: new Date("2026-09-21"),
        channelIds: null,
        raw: null,
      },
      {
        dedupHash: "ca",
        title: "Internship - Winter 2027 - Aerospace Manufacturing",
        company: "RTX",
        location: "CA-NS-HALIFAX-PLANT 41 ~ 189 Pratt & Whitney Dr ~ PLANT 41",
        url: "https://a.com/ca",
        level: "internship",
        sourceName: "workday",
        roleFamily: JSON.stringify(["engineering"]),
        roleTitles: JSON.stringify(["eng-aerospace"]),
        publishedAt: new Date("2026-09-06"),
        firstSeenAt: new Date("2026-09-21"),
        channelIds: null,
        raw: null,
      },
    ]);

    const result = await seedRecentPostings(send, new Date("2026-09-14"));

    expect(result).toEqual({ sent: 0, skipped: 2 });
    expect(send).not.toHaveBeenCalled();
  });

  it("posts oldest first and remaps leftover engineering tags", async () => {
    mockFindManyMap.mockResolvedValue([
      { kind: "job", roleFamily: "civil-structural", channelId: "theta_civil" },
      { kind: "job", roleFamily: "chemical", channelId: "theta_chem" },
    ]);
    mockPostingUpdate.mockResolvedValue({});
    mockFindManyPosting.mockResolvedValue([
      {
        dedupHash: "new",
        title: "Structural Engineering Co-op (Summer/Fall 2027)",
        company: "RTX",
        location: "US",
        url: "https://a.com/new",
        level: "co-op",
        sourceName: "workday",
        roleFamily: JSON.stringify(["civil-structural"]),
        roleTitles: JSON.stringify(["eng-structural"]),
        publishedAt: new Date("2026-09-21T00:00:00Z"),
        firstSeenAt: new Date("2026-09-21T20:00:00Z"),
        channelIds: null,
        raw: JSON.stringify({ postedOn: "Posted Today" }),
      },
      {
        dedupHash: "old",
        title: "Summer 2027 Civil Engineering Internship",
        company: "SpaceX",
        location: "US",
        url: "https://a.com/old",
        level: "internship",
        sourceName: "greenhouse",
        roleFamily: JSON.stringify(["engineering"]),
        roleTitles: JSON.stringify(["eng-civil"]),
        publishedAt: new Date("2026-08-03T17:42:56Z"),
        firstSeenAt: new Date("2026-09-21T03:55:00Z"),
        channelIds: null,
        raw: null,
      },
    ]);

    const result = await seedRecentPostings(send, new Date("2026-09-14"));

    expect(result.sent).toBe(2);
    expect(send.mock.calls[0][1]).toBe("old");
    expect(send.mock.calls[1][1]).toBe("new");
    expect(send.mock.calls[0][0].roleFamily).toEqual(["civil-structural"]);
    expect(mockPostingUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { dedupHash: "old" },
        data: expect.objectContaining({
          roleFamily: JSON.stringify(["civil-structural"]),
        }),
      })
    );
  });
});

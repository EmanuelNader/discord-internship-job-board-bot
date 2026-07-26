import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDetectLevel = vi.hoisted(() => vi.fn());
const mockDetectRoleFamily = vi.hoisted(() => vi.fn());
const mockDetectRoleTitles = vi.hoisted(() => vi.fn());
const mockDedupHash = vi.hoisted(() => vi.fn());
const mockGetAllAdapters = vi.hoisted(() => vi.fn());

vi.mock("@/db/client", () => ({
  prisma: {
    posting: {
      upsert: vi.fn(),
    },
    source: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/normalize", () => ({
  detectLevel: mockDetectLevel,
  detectRoleFamily: mockDetectRoleFamily,
  detectRoleTitles: mockDetectRoleTitles,
  dedupHash: mockDedupHash,
}));

vi.mock("@/adapters", () => ({
  getAllAdapters: mockGetAllAdapters,
}));

import { runBackfill } from "@/scheduler/backfill";

const { prisma } = await import("@/db/client");

describe("Backfill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips when disabled", async () => {
    await runBackfill({ enabled: false, limitPerSource: 100 });
    expect(mockGetAllAdapters).not.toHaveBeenCalled();
  });

  it("runs all adapters and upserts postings with postedAt", async () => {
    mockGetAllAdapters.mockReturnValue([
      {
        name: "test",
        pollIntervalSec: 300,
        fetchNewPostings: vi.fn().mockResolvedValue([
          { title: "Software Engineer Intern", company: "Acme", location: "SF", url: "https://a.com/1", externalId: "ext1", raw: {} },
        ]),
      },
    ]);
    mockDetectLevel.mockReturnValue("internship");
    mockDetectRoleFamily.mockReturnValue(["swe"]);
    mockDetectRoleTitles.mockReturnValue(["swe-frontend"]);
    mockDedupHash.mockReturnValue("hash123");
    (prisma.posting.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1 });

    await runBackfill({ enabled: true, limitPerSource: 100 });

    expect(prisma.posting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { dedupHash: "hash123" },
        create: expect.objectContaining({
          postedAt: expect.any(Date),
        }),
      })
    );
  });

  it("respects limitPerSource", async () => {
    mockGetAllAdapters.mockReturnValue([
      {
        name: "test",
        pollIntervalSec: 300,
        fetchNewPostings: vi.fn().mockResolvedValue([
          { title: "Intern A", company: "Acme", url: "https://a.com/1", raw: {} },
          { title: "Intern B", company: "Acme", url: "https://a.com/2", raw: {} },
          { title: "Intern C", company: "Acme", url: "https://a.com/3", raw: {} },
        ]),
      },
    ]);
    mockDetectLevel.mockReturnValue("internship");
    mockDetectRoleFamily.mockReturnValue(["swe"]);
    mockDetectRoleTitles.mockReturnValue([]);
    mockDedupHash.mockReturnValue("hash");
    (prisma.posting.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1 });

    await runBackfill({ enabled: true, limitPerSource: 2 });

    expect(prisma.posting.upsert).toHaveBeenCalledTimes(2);
  });

  it("skips non-internship postings", async () => {
    mockGetAllAdapters.mockReturnValue([
      {
        name: "test",
        pollIntervalSec: 300,
        fetchNewPostings: vi.fn().mockResolvedValue([
          { title: "Senior Engineer", company: "Acme", url: "https://a.com/1", raw: {} },
        ]),
      },
    ]);
    mockDetectLevel.mockReturnValue(null);

    await runBackfill({ enabled: true, limitPerSource: 100 });

    expect(prisma.posting.upsert).not.toHaveBeenCalled();
  });

  it("handles adapter errors gracefully", async () => {
    mockGetAllAdapters.mockReturnValue([
      {
        name: "failing",
        pollIntervalSec: 300,
        fetchNewPostings: vi.fn().mockRejectedValue(new Error("Network error")),
      },
    ]);

    await expect(runBackfill({ enabled: true, limitPerSource: 100 })).resolves.toBeUndefined();
  });
});

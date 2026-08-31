import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDetectLevel = vi.hoisted(() => vi.fn());
const mockDetectRoleFamily = vi.hoisted(() => vi.fn());
const mockDetectRoleTitles = vi.hoisted(() => vi.fn());
const mockDedupHash = vi.hoisted(() => vi.fn());
const mockContentHash = vi.hoisted(() => vi.fn(() => "content-hash-123"));
const mockIsUsLocation = vi.hoisted(() => vi.fn(() => true));
const mockGetAllAdapters = vi.hoisted(() => vi.fn());

vi.mock("@/db/client", () => ({
  prisma: {
    posting: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
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
  contentHash: mockContentHash,
  isUsLocation: mockIsUsLocation,
}));

vi.mock("@/adapters", () => ({
  getAllAdapters: mockGetAllAdapters,
}));

import { runBackfill } from "@/scheduler/backfill";

const { prisma } = await import("@/db/client");

describe("Backfill", () => {
  let onNewPosting: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    onNewPosting = vi.fn().mockResolvedValue(undefined);
  });

  it("skips when disabled", async () => {
    await runBackfill({ enabled: false, limitPerSource: 100 }, onNewPosting);
    expect(mockGetAllAdapters).not.toHaveBeenCalled();
    expect(onNewPosting).not.toHaveBeenCalled();
  });

  it("creates postings with postedAt null and calls onNewPosting", async () => {
    const publishedAt = new Date("2026-06-15T10:00:00Z");
    const firstSeenAt = new Date("2026-06-16T10:00:00Z");
    mockGetAllAdapters.mockReturnValue([
      {
        name: "test",
        pollIntervalSec: 300,
        fetchNewPostings: vi.fn().mockResolvedValue([
          { title: "Software Engineer Intern", company: "Acme", location: "SF", url: "https://a.com/1", externalId: "ext1", publishedAt: publishedAt.toISOString(), raw: {} },
        ]),
      },
    ]);
    mockDetectLevel.mockReturnValue("internship");
    mockDetectRoleFamily.mockReturnValue(["swe"]);
    mockDetectRoleTitles.mockReturnValue(["swe-frontend"]);
    mockDedupHash.mockReturnValue("hash123");
    (prisma.posting.findUnique as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(null) // contentHash check
      .mockResolvedValueOnce({ id: 1, dedupHash: "hash123", postedAt: null, publishedAt, firstSeenAt });
    (prisma.posting.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1 });

    await runBackfill({ enabled: true, limitPerSource: 100 }, onNewPosting);

    expect(prisma.posting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { dedupHash: "hash123" },
        create: expect.objectContaining({
          postedAt: null,
          publishedAt,
        }),
      })
    );

    expect(onNewPosting).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Software Engineer Intern",
        company: "Acme",
        sourceName: "test",
        roleFamily: ["swe"],
        roleTitles: ["swe-frontend"],
        level: "internship",
        postedAt: publishedAt,
      }),
      "hash123"
    );
  });

  it("does not call onNewPosting for existing dedupHash already posted", async () => {
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
    (prisma.posting.findUnique as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(null) // contentHash check
      .mockResolvedValueOnce({ id: 1, dedupHash: "hash123", postedAt: new Date(), publishedAt: null, firstSeenAt: new Date() });
    (prisma.posting.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1 });

    await runBackfill({ enabled: true, limitPerSource: 100 }, onNewPosting);

    expect(prisma.posting.upsert).toHaveBeenCalled();
    expect(onNewPosting).not.toHaveBeenCalled();
  });

  it("does not call onNewPosting when contentHash already exists", async () => {
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
    (prisma.posting.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 99,
      contentHash: "content-hash-123",
      postedAt: new Date(),
    });

    await runBackfill({ enabled: true, limitPerSource: 100 }, onNewPosting);

    expect(prisma.posting.upsert).not.toHaveBeenCalled();
    expect(onNewPosting).not.toHaveBeenCalled();
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
    (prisma.posting.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.posting.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1 });

    await runBackfill({ enabled: true, limitPerSource: 2 }, onNewPosting);

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

    await runBackfill({ enabled: true, limitPerSource: 100 }, onNewPosting);

    expect(prisma.posting.upsert).not.toHaveBeenCalled();
    expect(onNewPosting).not.toHaveBeenCalled();
  });

  it("handles adapter errors gracefully", async () => {
    mockGetAllAdapters.mockReturnValue([
      {
        name: "failing",
        pollIntervalSec: 300,
        fetchNewPostings: vi.fn().mockRejectedValue(new Error("Network error")),
      },
    ]);

    await expect(runBackfill({ enabled: true, limitPerSource: 100 }, onNewPosting)).resolves.toBeUndefined();
    expect(onNewPosting).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDetectLevel = vi.hoisted(() => vi.fn());
const mockDetectRoleFamily = vi.hoisted(() => vi.fn());
const mockDetectRoleTitles = vi.hoisted(() => vi.fn());
const mockDedupHash = vi.hoisted(() => vi.fn());

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
}));

import { SourcesManager } from "@/scheduler/index";
import type { SourceAdapter } from "@/lib/types";

const { prisma } = await import("@/db/client");

describe("SourcesManager", () => {
  let mockAdapter: SourceAdapter;
  let onNewPosting: ReturnType<typeof vi.fn>;
  let onError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAdapter = {
      name: "test",
      pollIntervalSec: 300,
      fetchNewPostings: vi.fn().mockResolvedValue([]),
    };

    onNewPosting = vi.fn();
    onError = vi.fn();
  });

  it("fetches postings from adapter", async () => {
    const manager = new SourcesManager([mockAdapter], onNewPosting, onError);
    await manager.runOnce("test");

    expect(mockAdapter.fetchNewPostings).toHaveBeenCalledOnce();
  });

  it("calls detectLevel and drops non-intern postings", async () => {
    mockAdapter.fetchNewPostings = vi.fn().mockResolvedValue([
      { title: "Senior Engineer", company: "Acme", url: "https://a.com/1", raw: {} },
    ]);
    mockDetectLevel.mockReturnValue(null);

    const manager = new SourcesManager([mockAdapter], onNewPosting, onError);
    await manager.runOnce("test");

    expect(mockDetectLevel).toHaveBeenCalled();
    expect(onNewPosting).not.toHaveBeenCalled();
    expect(prisma.source.upsert).toHaveBeenCalled();
    const call = (prisma.source.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.create.droppedNonIntern).toBe(1);
  });

  it("drops postings with unclassifiable role family", async () => {
    mockAdapter.fetchNewPostings = vi.fn().mockResolvedValue([
      { title: "Intern", company: "Acme", url: "https://a.com/1", raw: {} },
    ]);
    mockDetectLevel.mockReturnValue("internship");
    mockDetectRoleFamily.mockReturnValue([]);

    const manager = new SourcesManager([mockAdapter], onNewPosting, onError);
    await manager.runOnce("test");

    expect(mockDetectRoleFamily).toHaveBeenCalled();
    expect(onNewPosting).not.toHaveBeenCalled();
    const call = (prisma.source.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.create.droppedUnclassified).toBe(1);
  });

  it("upserts new posting and calls onNewPosting", async () => {
    mockAdapter.fetchNewPostings = vi.fn().mockResolvedValue([
      { title: "Software Engineer Intern", company: "Acme", location: "SF", url: "https://a.com/1", externalId: "ext1", raw: {} },
    ]);
    mockDetectLevel.mockReturnValue("internship");
    mockDetectRoleFamily.mockReturnValue(["swe"]);
    mockDetectRoleTitles.mockReturnValue(["swe-frontend"]);
    mockDedupHash.mockReturnValue("hash123");
    (prisma.posting.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1 });
    (prisma.posting.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      dedupHash: "hash123",
      postedAt: null,
    });

    const manager = new SourcesManager([mockAdapter], onNewPosting, onError);
    await manager.runOnce("test");

    expect(prisma.posting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { dedupHash: "hash123" },
        create: expect.objectContaining({
          company: "Acme",
          level: "internship",
        }),
      })
    );
    expect(onNewPosting).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Software Engineer Intern",
        company: "Acme",
        roleFamilies: ["swe"],
        roleTitles: ["swe-frontend"],
        level: "internship",
      })
    );
  });

  it("does not call onNewPosting for already-posted duplicates", async () => {
    mockAdapter.fetchNewPostings = vi.fn().mockResolvedValue([
      { title: "Intern", company: "Acme", url: "https://a.com/1", raw: {} },
    ]);
    mockDetectLevel.mockReturnValue("internship");
    mockDetectRoleFamily.mockReturnValue(["swe"]);
    mockDetectRoleTitles.mockReturnValue([]);
    mockDedupHash.mockReturnValue("hash123");
    (prisma.posting.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1 });
    (prisma.posting.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      dedupHash: "hash123",
      postedAt: new Date(),
    });

    const manager = new SourcesManager([mockAdapter], onNewPosting, onError);
    await manager.runOnce("test");

    expect(onNewPosting).not.toHaveBeenCalled();
  });

  it("tracks source health after run", async () => {
    mockAdapter.fetchNewPostings = vi.fn().mockResolvedValue([]);
    (prisma.source.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({ name: "test" });

    const manager = new SourcesManager([mockAdapter], onNewPosting, onError);
    await manager.runOnce("test");

    expect(prisma.source.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { name: "test" },
      })
    );
  });

  it("reports errors via onError and updates health", async () => {
    const testError = new Error("Network failure");
    mockAdapter.fetchNewPostings = vi.fn().mockRejectedValue(testError);

    const manager = new SourcesManager([mockAdapter], onNewPosting, onError);
    await manager.runOnce("test");

    expect(onError).toHaveBeenCalledWith("test", testError);
    const call = (prisma.source.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.create.lastError).toBe("Network failure");
  });

  it("start() runs all adapters immediately and sets intervals", async () => {
    vi.useFakeTimers();
    const adapter1: SourceAdapter = {
      name: "a1", pollIntervalSec: 10,
      fetchNewPostings: vi.fn().mockResolvedValue([]),
    };
    const adapter2: SourceAdapter = {
      name: "a2", pollIntervalSec: 20,
      fetchNewPostings: vi.fn().mockResolvedValue([]),
    };

    const manager = new SourcesManager([adapter1, adapter2], onNewPosting, onError);
    manager.start();

    expect(adapter1.fetchNewPostings).toHaveBeenCalledTimes(1);
    expect(adapter2.fetchNewPostings).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(10000);
    expect(adapter1.fetchNewPostings).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(10000);
    expect(adapter2.fetchNewPostings).toHaveBeenCalledTimes(2);

    manager.stop();
    vi.useRealTimers();
  });

  it("stop() clears all intervals", async () => {
    vi.useFakeTimers();
    const adapter = { name: "a", pollIntervalSec: 10, fetchNewPostings: vi.fn().mockResolvedValue([]) };

    const manager = new SourcesManager([adapter], onNewPosting, onError);
    manager.start();

    expect(adapter.fetchNewPostings).toHaveBeenCalledTimes(1);

    manager.stop();
    vi.advanceTimersByTime(10000);
    expect(adapter.fetchNewPostings).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});

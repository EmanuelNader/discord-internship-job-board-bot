import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindUnique = vi.hoisted(() => vi.fn());
const mockCreate = vi.hoisted(() => vi.fn());

vi.mock("@/db/client", () => ({
  prisma: {
    guildState: {
      findUnique: mockFindUnique,
      create: mockCreate,
    },
  },
}));

import { ensureLiveSince } from "@/lib/live-since";

describe("ensureLiveSince", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the stored onboard day", async () => {
    const liveSince = new Date("2026-09-02T00:00:00Z");
    mockFindUnique.mockResolvedValue({ guildId: "g1", liveSince });

    await expect(ensureLiveSince("g1")).resolves.toEqual(liveSince);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("persists UTC midnight of first boot", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({});

    const liveSince = await ensureLiveSince("g1", new Date("2026-09-02T18:41:00Z"));
    expect(liveSince.toISOString()).toBe("2026-09-02T00:00:00.000Z");
    expect(mockCreate).toHaveBeenCalledWith({
      data: { guildId: "g1", liveSince: new Date("2026-09-02T00:00:00Z") },
    });
  });
});

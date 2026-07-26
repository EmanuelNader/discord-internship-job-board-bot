import { describe, it, expect, vi, beforeEach } from "vitest";

const mockChannelSend = vi.hoisted(() => vi.fn());
const mockFindMany = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());
const mockClientChannelsFetch = vi.hoisted(() => vi.fn());

vi.mock("@/db/client", () => ({
  prisma: {
    channelMap: { findMany: mockFindMany },
    posting: {
      update: mockUpdate,
    },
  },
}));

vi.mock("@/poster/embed", () => ({
  buildPostingEmbed: vi.fn(() => ({ toJSON: () => ({ title: "Mock" }) })),
}));

import { Poster } from "@/poster/index";

describe("Poster", () => {
  let poster: Poster;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClientChannelsFetch.mockReset();

    const mockClient = {
      channels: { fetch: mockClientChannelsFetch },
    } as any;

    poster = new Poster(mockClient);
  });

  it("looks up channel map and sends embed", async () => {
    mockFindMany.mockResolvedValue([
      { kind: "job", roleFamily: "swe", channelId: "111" },
    ]);
    mockClientChannelsFetch.mockResolvedValue({
      send: mockChannelSend.mockResolvedValue({ id: "msg1" }),
      isTextBased: () => true,
    });

    await poster.send(
      {
        title: "SWE Intern",
        company: "Acme",
        url: "https://a.com",
        level: "internship",
        sourceName: "greenhouse",
        location: "SF",
        roleFamily: ["swe"],
        roleTitles: ["swe-frontend"],
      },
      "hash123"
    );

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { kind: "job", roleFamily: { in: ["swe"] } },
    });
    expect(mockClientChannelsFetch).toHaveBeenCalledWith("111");
    expect(mockChannelSend).toHaveBeenCalledOnce();
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { dedupHash: "hash123" },
      data: expect.objectContaining({
        postedAt: expect.any(Date),
        channelIds: expect.any(String),
      }),
    });
  });

  it("skips when no channel map entry found", async () => {
    mockFindMany.mockResolvedValue([]);

    await poster.send(
      {
        title: "Intern",
        company: "Acme",
        url: "https://a.com",
        level: "internship",
        sourceName: "gh",
        location: null,
        roleFamily: ["swe"],
        roleTitles: [],
      },
      "hash123"
    );

    expect(mockClientChannelsFetch).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

const samplePosting = {
  title: "SWE Intern",
  company: "Acme",
  url: "https://a.com",
  level: "internship",
  sourceName: "greenhouse",
  location: "SF",
  roleFamily: ["swe"],
  roleTitles: ["swe-frontend"],
};

describe("Poster", () => {
  let poster: Poster;
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClientChannelsFetch.mockReset();

    mockClient = {
      channels: { fetch: mockClientChannelsFetch },
      guilds: {
        cache: {
          first: () => ({
            roles: { cache: [] },
          }),
        },
      },
    };

    poster = new Poster(mockClient);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("looks up channel map and sends embed", async () => {
    mockFindMany.mockResolvedValue([
      { kind: "job", roleFamily: "swe", channelId: "111" },
    ]);
    mockClientChannelsFetch.mockResolvedValue({
      send: mockChannelSend.mockResolvedValue({ id: "msg1" }),
      isTextBased: () => true,
    });

    await poster.send(samplePosting, "hash123");

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

  it("spaces Discord sends by intervalMs", async () => {
    vi.useFakeTimers();
    const intervalMs = 2000;
    poster = new Poster(mockClient, undefined, intervalMs);

    mockFindMany.mockResolvedValue([
      { kind: "job", roleFamily: "swe", channelId: "111" },
    ]);
    mockClientChannelsFetch.mockResolvedValue({
      send: mockChannelSend.mockResolvedValue({ id: "msg1" }),
      isTextBased: () => true,
    });

    const p1 = poster.send({ ...samplePosting, title: "A" }, "hashA");
    const p2 = poster.send({ ...samplePosting, title: "B" }, "hashB");

    await vi.advanceTimersByTimeAsync(0);
    expect(mockChannelSend).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(intervalMs - 1);
    expect(mockChannelSend).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(mockChannelSend).toHaveBeenCalledTimes(2);

    await Promise.all([p1, p2]);
  });
});

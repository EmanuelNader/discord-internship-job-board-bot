import { describe, it, expect, vi, beforeEach } from "vitest";

const mockChannelCreate = vi.hoisted(() => vi.fn());
const mockRoleCreate = vi.hoisted(() => vi.fn());
const mockChannelsFetch = vi.hoisted(() => vi.fn());
const mockRolesFetch = vi.hoisted(() => vi.fn());
const mockChannelMapUpsert = vi.hoisted(() => vi.fn());

vi.mock("@/db/client", () => ({
  prisma: {
    channelMap: { upsert: mockChannelMapUpsert },
  },
}));

import { ensureGuildSetup } from "@/provisioner/index";

describe("ensureGuildSetup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChannelsFetch.mockResolvedValue([]);
    mockRolesFetch.mockResolvedValue([]);
  });

  it("creates missing channels and roles", async () => {
    const mockGuild = {
      channels: { fetch: mockChannelsFetch, create: mockChannelCreate },
      roles: { fetch: mockRolesFetch, create: mockRoleCreate },
    };

    const mockClient = {
      guilds: {
        cache: {
          first: () => mockGuild,
        },
      },
    } as any;

    mockChannelCreate.mockResolvedValue({ id: "chan_1" });
    mockRoleCreate.mockResolvedValue({ id: "role_1" });

    await ensureGuildSetup(mockClient);

    // Should create at least one channel (swe-jobs)
    expect(mockChannelCreate).toHaveBeenCalled();
    expect(mockChannelMapUpsert).toHaveBeenCalled();
    // Should create multiple roles
    expect(mockRoleCreate).toHaveBeenCalled();
  });

  it("skips existing channels and roles", async () => {
    const mockGuild = {
      channels: {
        fetch: vi.fn().mockResolvedValue([
          { name: "swe-jobs", id: "existing_chan" },
        ]),
        create: mockChannelCreate,
      },
      roles: {
        fetch: vi.fn().mockResolvedValue([
          { name: "SWE - Frontend", id: "existing_role" },
        ]),
        create: mockRoleCreate,
      },
    };

    const mockClient = {
      guilds: {
        cache: {
          first: () => mockGuild,
        },
      },
    } as any;

    await ensureGuildSetup(mockClient);

    // Should NOT create existing channel or role
    expect(mockChannelCreate).not.toHaveBeenCalledWith(expect.objectContaining({ name: "swe-jobs" }));
    expect(mockRoleCreate).not.toHaveBeenCalledWith(expect.objectContaining({ name: "SWE - Frontend" }));
  });
});

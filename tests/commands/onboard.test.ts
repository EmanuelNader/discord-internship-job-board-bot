import { describe, it, expect, vi, beforeEach } from "vitest";

const mockEnsureGuildSetup = vi.hoisted(() => vi.fn());
const mockOnboardUpsert = vi.hoisted(() => vi.fn());
const mockOnboardFindUnique = vi.hoisted(() => vi.fn());

vi.mock("@/provisioner/index", () => ({
  ensureGuildSetup: mockEnsureGuildSetup,
}));

vi.mock("@/db/client", () => ({
  prisma: {
    onboardPanel: {
      upsert: mockOnboardUpsert,
      findUnique: mockOnboardFindUnique,
    },
  },
}));

import { buildOnboardEmbed, handleOnboard } from "@/commands/onboard";
import { familyForEmoji, handleOnboardReaction } from "@/commands/onboard-reactions";

describe("onboard embed", () => {
  it("describes sources and reaction families", () => {
    const embed = buildOnboardEmbed().toJSON();
    expect(embed.title).toMatch(/intern/i);
    expect(embed.description).toMatch(/react/i);
    expect(embed.description).toMatch(/#job-board/);
    const fields = embed.fields ?? [];
    expect(fields.some((f) => /scrapes/i.test(f.name) && /GitHub/i.test(f.value))).toBe(true);
    const pings = fields.find((f) => /pings/i.test(f.name));
    expect(pings?.value).toContain("💻");
    expect(pings?.value).toContain("#civil-structural-jobs");
    expect(pings?.value).toContain("#mechanical-jobs");
    expect(pings?.value).toContain("#other-jobs");
    expect(pings?.value).toContain("Other (Design + Growth)");
    expect(pings?.value).not.toContain("#engineering-jobs");
    expect(pings?.value).not.toContain("#design-jobs");
    expect(pings?.value).not.toContain("#growth-jobs");
  });
});

describe("handleOnboard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates channels then posts a reaction panel", async () => {
    const react = vi.fn();
    const overviewSend = vi.fn().mockResolvedValue({ id: "msg_1", react });
    mockEnsureGuildSetup.mockResolvedValue({ id: "overview_1", send: overviewSend });
    mockOnboardFindUnique.mockResolvedValue(null);
    const send = vi.fn();
    const editReply = vi.fn();
    const interaction = {
      deferReply: vi.fn().mockResolvedValue(undefined),
      editReply,
      guildId: "guild_1",
      guild: { id: "guild_1", channels: { fetch: vi.fn() } },
      client: {},
      channel: {
        isTextBased: () => true,
        isDMBased: () => false,
        send,
        id: "general_1",
      },
    } as any;

    await handleOnboard(interaction);

    expect(mockEnsureGuildSetup).toHaveBeenCalledWith(interaction.guild);
    expect(send).not.toHaveBeenCalled();
    expect(overviewSend).toHaveBeenCalled();
    expect(react).toHaveBeenCalled();
    expect(mockOnboardUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { guildId: "guild_1" },
        create: expect.objectContaining({ messageId: "msg_1", channelId: "overview_1" }),
      })
    );
    expect(editReply).toHaveBeenCalledWith(expect.objectContaining({
      content: expect.stringContaining("overview_1"),
    }));
  });

  it("deletes a leftover panel in #general before posting in #job-board", async () => {
    const react = vi.fn();
    const overviewSend = vi.fn().mockResolvedValue({ id: "msg_2", react });
    mockEnsureGuildSetup.mockResolvedValue({ id: "overview_1", send: overviewSend });
    const deleteOld = vi.fn();
    mockOnboardFindUnique.mockResolvedValue({
      guildId: "guild_1",
      channelId: "general_1",
      messageId: "old_msg",
    });
    const interaction = {
      deferReply: vi.fn().mockResolvedValue(undefined),
      editReply: vi.fn(),
      guildId: "guild_1",
      guild: {
        id: "guild_1",
        channels: {
          fetch: vi.fn().mockResolvedValue({
            isTextBased: () => true,
            messages: {
              fetch: vi.fn().mockResolvedValue({ delete: deleteOld }),
            },
          }),
        },
      },
    } as any;

    await handleOnboard(interaction);

    expect(deleteOld).toHaveBeenCalled();
    expect(overviewSend).toHaveBeenCalled();
  });
});

describe("handleOnboardReaction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps family emojis", () => {
    expect(familyForEmoji("💻")?.family).toBe("swe");
    expect(familyForEmoji("🌉")?.family).toBe("civil-structural");
    expect(familyForEmoji("⚙️")?.family).toBe("mechanical");
    expect(familyForEmoji("⚡")?.family).toBe("electrical");
    expect(familyForEmoji("🧪")?.family).toBe("chemical");
    expect(familyForEmoji("🚀")?.family).toBe("aerospace");
    expect(familyForEmoji("📦")?.family).toBe("other");
    expect(familyForEmoji("nope")).toBeUndefined();
  });

  it("assigns the family ping role on react", async () => {
    mockOnboardFindUnique.mockResolvedValue({ messageId: "msg_1" });
    const add = vi.fn();
    const swe = { name: "SWE" };
    const reaction = {
      partial: false,
      emoji: { name: "💻" },
      message: {
        id: "msg_1",
        guild: {
          members: { fetch: vi.fn().mockResolvedValue({ roles: { add, remove: vi.fn() } }) },
          roles: {
            cache: { find: (fn: (r: { name: string }) => boolean) => [swe].find(fn) },
            fetch: vi.fn().mockResolvedValue(undefined),
          },
        },
      },
    } as any;

    await handleOnboardReaction(reaction, { bot: false, id: "user_1" } as any, true);
    expect(add).toHaveBeenCalledWith(swe);
  });

  it("ignores reactions on other messages", async () => {
    mockOnboardFindUnique.mockResolvedValue(null);
    const add = vi.fn();
    const reaction = {
      partial: false,
      emoji: { name: "💻" },
      message: { id: "other", guild: { members: { fetch: vi.fn() } } },
    } as any;
    await handleOnboardReaction(reaction, { bot: false, id: "user_1" } as any, true);
    expect(add).not.toHaveBeenCalled();
  });
});

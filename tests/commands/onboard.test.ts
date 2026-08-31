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
    const fields = embed.fields ?? [];
    expect(fields.some((f) => /scrapes/i.test(f.name) && /GitHub/i.test(f.value))).toBe(true);
    expect(fields.some((f) => /pings/i.test(f.name) && f.value.includes("💻"))).toBe(true);
  });
});

describe("handleOnboard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates channels then posts a reaction panel", async () => {
    const react = vi.fn();
    const send = vi.fn().mockResolvedValue({ id: "msg_1", react });
    const editReply = vi.fn();
    const interaction = {
      deferReply: vi.fn().mockResolvedValue(undefined),
      editReply,
      guildId: "guild_1",
      client: {},
      channel: {
        isTextBased: () => true,
        isDMBased: () => false,
        send,
        id: "chan_1",
      },
    } as any;

    await handleOnboard(interaction);

    expect(mockEnsureGuildSetup).toHaveBeenCalled();
    expect(send).toHaveBeenCalled();
    expect(react).toHaveBeenCalled();
    expect(mockOnboardUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { guildId: "guild_1" },
        create: expect.objectContaining({ messageId: "msg_1" }),
      })
    );
  });
});

describe("handleOnboardReaction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("maps family emojis", () => {
    expect(familyForEmoji("💻")?.family).toBe("swe");
    expect(familyForEmoji("⚙️")?.family).toBe("engineering");
    expect(familyForEmoji("nope")).toBeUndefined();
  });

  it("assigns every ping role in the family on react", async () => {
    mockOnboardFindUnique.mockResolvedValue({ messageId: "msg_1" });
    const add = vi.fn();
    const frontend = { name: "SWE - Frontend" };
    const backend = { name: "SWE - Backend" };
    const reaction = {
      partial: false,
      emoji: { name: "💻" },
      message: {
        id: "msg_1",
        guild: {
          members: { fetch: vi.fn().mockResolvedValue({ roles: { add, remove: vi.fn() } }) },
          roles: {
            cache: { find: (fn: (r: { name: string }) => boolean) => [frontend, backend].find(fn) },
            fetch: vi.fn().mockResolvedValue(undefined),
          },
        },
      },
    } as any;

    await handleOnboardReaction(reaction, { bot: false, id: "user_1" } as any, true);
    expect(add).toHaveBeenCalledWith(frontend);
    expect(add).toHaveBeenCalledWith(backend);
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

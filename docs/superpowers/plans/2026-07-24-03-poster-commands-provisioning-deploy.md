# Discord Poster + Channel Router + Commands + Provisioning + Deploy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Discord-facing layer: poster that pulls unposted `Posting` rows, routes by `roleFamily[]` to channels via `ChannelMap`, sends embeds with `allowedMentions` pinging only matched per-title roles; slash commands (`/ping`, `/role`, `/unrole`, `/status`, `/linkchannel`, `/setup`); role/channel auto-provisioning on boot; PM2 deployment config.

**Architecture:** Plan 1 (contract + normalize + DB) + Plan 2 (adapters + scheduler) produce `Posting` rows with `postedAt = null`. This plan consumes them: `Poster` pulls unseen rows → for each `roleFamily` finds `ChannelMap` → builds embed → sends to channel with `allowedMentions.roles = [matched ping role IDs]` → updates `postedAt` + `channelIds`. `CommandHandler` registers slash commands via REST, handles interactions. `Provisioner` runs on `ready` to ensure channels/roles exist per `roles.config.ts`.

**Tech Stack:** discord.js v14 (Builders API, `GatewayIntentBits.Guilds | GuildMessages | GuildMessageReactions`), Prisma Client, `@discordjs/rest` for command registration, `EmbedBuilder`, rate-limited poster queue (1 post / 2s), PM2 ecosystem file.

---

## Global Constraints (from Plans 1, 2 + Spec)

- **Types:** All from `src/lib/types.ts` (Plan 1): `Posting`, `Level`, `RoleFamily`, `RoleTitle`, `SourceName`, `PostingKind`, `RawPosting`.
- **Normalize:** `detectLevel`, `detectRoleFamily`, `detectRoleTitles`, `dedupHash` from `src/lib/normalize.ts` (Plan 1).
- **Config:** `roleFamilies` from `src/config/roles.config.ts` (Plan 1) — drives provisioning, `/role` autocomplete, ping role mapping.
- **DB:** `prisma` singleton from `src/db/client.ts` (Plan 1). Models: `Posting`, `Source`, `ChannelMap` (Plan 1 schema).
- **Poster rate limit:** 1 embed per 2 seconds (token bucket or simple queue with `setTimeout`).
- **Backfill behavior (Plan 2):** Backfilled rows have `postedAt` set → poster skips them. New postings after backfill have `postedAt = null` → poster sends them.
- **Intents:** `Guilds`, `GuildMessages`, `GuildMessageReactions` (spec Section 8).
- **Commands:** Builders API (`SlashCommandBuilder`), registered globally via `Routes.applicationCommands(clientId)`.
- **Env:** `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `GUILD_ID` (for dev guild command sync), `GITHUB_TOKEN`, `DATABASE_URL`.
- **Deploy:** PM2 `ecosystem.config.cjs` with `dist/bot.js` entry, `NODE_ENV=production`, env from `.env` or PM2 env.

---

## File Structure Map (Plan 3 Scope)

```
C:\Users\emann\OneDrive\Desktop\discordbot\
├── src/
│   ├── poster/
│   │   ├── index.ts           # Poster class + rate-limited queue
│   │   └── embed.ts           # buildEmbed(Posting) -> EmbedBuilder
│   ├── commands/
│   │   ├── index.ts           # command registry + handler
│   │   ├── ping.ts
│   │   ├── role.ts
│   │   ├── unrole.ts
│   │   ├── status.ts
│   │   ├── linkchannel.ts
│   │   └── setup.ts
│   ├── provisioning/
│   │   └── index.ts           # ensureChannelsRoles(guild) -> void
│   ├── scheduler/
│   │   └── index.ts           # (Plan 2) SourcesManager — imports Poster.onNewPosting
│   └── index.ts               # bootstrap: Client, Provisioner, Poster, Scheduler, Commands
├── tests/
│   ├── poster/
│   │   ├── embed.test.ts
│   │   └── index.test.ts
│   └── commands/
│       ├── ping.test.ts
│       ├── role.test.ts
│       ├── status.test.ts
│       ├── linkchannel.test.ts
│       └── setup.test.ts
├── ecosystem.config.cjs       # PM2 config
└── prisma/schema.prisma       # (Plan 1) unchanged
```

---

## Interfaces (Produced by This Plan, Consumed by Runtime)

```ts
// src/poster/index.ts
import type { Posting, RoleTitle } from "@/lib/types";

export interface PosterDeps {
  client: import("discord.js").Client<true>;
  getChannelId: (kind: string, roleFamily: string) => Promise<string | null>;
  getPingRoleIds: (guild: import("discord.js").Guild, titles: RoleTitle[]) => Promise<string[]>;
}

export class Poster {
  constructor(deps: PosterDeps);
  start(): void;           // begins polling loop
  stop(): void;
  enqueue(posting: Posting): void;  // called by Scheduler.onNewPosting
}
```

```ts
// src/commands/index.ts
import type { ChatInputCommandInteraction, AutocompleteInteraction } from "discord.js";

export interface Command {
  data: import("discord.js").SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}

export const commands: Command[];
export async function registerCommands(clientId: string, token: string, guildId?: string): Promise<void>;
export async function handleInteraction(interaction: ChatInputCommandInteraction): Promise<void>;
```

```ts
// src/provisioning/index.ts
import type { RoleFamilyConfig } from "@/config/roles.config";

export async function ensureGuildSetup(guild: import("discord.js").Guild): Promise<{
  channels: Map<string, string>;    // roleFamily -> channelId
  pingRoles: Map<string, string>;   // roleTitle -> roleId
}>;
```

---

## Task Breakdown

### Task 1: Poster Embed Builder (`src/poster/embed.ts` + test)

**Files:**
- Create: `src/poster/embed.ts`
- Create: `tests/poster/embed.test.ts`

```ts
// src/poster/embed.ts
import { EmbedBuilder, Colors } from "discord.js";
import type { Posting, Level, RoleTitle } from "@/lib/types";

const LEVEL_COLOR: Record<Level, number> = {
  internship: Colors.Blue,
  "co-op": Colors.Green,
  fellowship: Colors.Purple,
};

const LEVEL_EMOJI: Record<Level, string> = {
  internship: "🎓",
  "co-op": "🔄",
  fellowship: "🏆",
};

export function buildEmbed(posting: Posting): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(posting.title)
    .setURL(posting.url)
    .setColor(LEVEL_COLOR[posting.level] ?? Colors.Default)
    .setTimestamp(posting.firstSeenAt)
    .setFooter({ text: `Source: ${posting.sourceName} • ${posting.kind}` });

  embed.addFields(
    { name: "👔 Company", value: posting.company, inline: true },
    { name: "📍 Location", value: posting.location ?? "Unspecified / Remote", inline: true },
    { name: "🆎 Level", value: `${LEVEL_EMOJI[posting.level]} ${posting.level}`, inline: true },
    { name: "🧑‍💻 Role", value: posting.roleTitles.map(formatRoleTitle).join(", ") || "—", inline: false }
  );

  return embed;
}

function formatRoleTitle(title: RoleTitle): string {
  const map: Record<RoleTitle, string> = {
    "swe-frontend": "Frontend", "swe-backend": "Backend", "swe-fullstack": "Fullstack",
    "swe-mobile": "Mobile", "swe-devops": "DevOps", "swe-embedded": "Embedded",
    "pm-product": "Product", "pm-program": "Program", "pm-tpm": "TPM",
    "hw-silicon": "Silicon", "hw-pcb": "PCB", "hw-fpga": "FPGA", "hw-asic": "ASIC",
    "data-scientist": "Data Scientist", "data-engineer": "Data Engineer", "data-analytics": "Analytics",
    "ml-engineer": "ML Engineer", "ml-researcher": "ML Researcher", "ml-ai-eng": "AI Engineer",
    "eng-structural": "Structural", "eng-civil": "Civil", "eng-electrical": "Electrical",
    "eng-mechanical": "Mechanical", "eng-chemical": "Chemical", "eng-aerospace": "Aerospace",
    "design-ux": "UX", "design-ui": "UI", "design-product": "Product Design", "design-interaction": "Interaction",
    "growth-general": "Growth", "growth-lifecycle": "Lifecycle", "growth-acquisition": "Acquisition",
  };
  return map[title] ?? title;
}
```

```ts
// tests/poster/embed.test.ts
import { describe, it, expect } from "vitest";
import { buildEmbed } from "@/poster/embed";

describe("buildEmbed", () => {
  it("builds correct embed for a SWE internship posting", () => {
    const posting = {
      dedupHash: "abc", externalId: "1", sourceName: "greenhouse", kind: "job",
      level: "internship", title: "Software Engineer Intern - Frontend",
      company: "Google", location: "Mountain View, CA",
      roleFamily: ["swe"], roleTitles: ["swe-frontend"],
      url: "https://careers.google.com/jobs/123", firstSeenAt: new Date(), raw: undefined,
    } as any;

    const embed = buildEmbed(posting);
    const data = embed.data;

    expect(data.title).toBe("Software Engineer Intern - Frontend");
    expect(data.url).toBe("https://careers.google.com/jobs/123");
    expect(data.color).toBe(Colors.Blue);
    expect(data.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "👔 Company", value: "Google" }),
      expect.objectContaining({ name: "📍 Location", value: "Mountain View, CA" }),
      expect.objectContaining({ name: "🆎 Level", value: "🎓 internship" }),
      expect.objectContaining({ name: "🧑‍💻 Role", value: "Frontend" }),
    ]));
  });

  it("handles null location", () => {
    const posting = { ...basePosting, location: null };
    const embed = buildEmbed(posting);
    expect(embed.data.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "📍 Location", value: "Unspecified / Remote" }),
    ]));
  });

  it("multiple role titles joined by comma", () => {
    const posting = { ...basePosting, roleTitles: ["swe-frontend", "swe-backend"] };
    const embed = buildEmbed(posting);
    expect(embed.data.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "🧑‍💻 Role", value: "Frontend, Backend" }),
    ]));
  });
});

const basePosting = {
  dedupHash: "abc", externalId: "1", sourceName: "greenhouse", kind: "job",
  level: "internship", title: "Test", company: "Test", location: "NYC",
  roleFamily: ["swe"], roleTitles: ["swe-frontend"],
  url: "http://x", firstSeenAt: new Date(), raw: undefined,
};
```

- [ ] **Step 1.1:** Write `tests/poster/embed.test.ts` (exact above).
- [ ] **Step 1.2:** Run test — FAIL.
- [ ] **Step 1.3:** Write `src/poster/embed.ts` (exact above).
- [ ] **Step 1.4:** Run test — PASS.
- [ ] **Step 1.5:** `git add src/poster/embed.ts tests/poster/embed.test.ts && git commit -m "feat(poster): embed builder + tests"`

---

### Task 2: Poster Core + Rate-Limited Queue (`src/poster/index.ts` + test)

**Files:**
- Create: `src/poster/index.ts`
- Create: `tests/poster/index.test.ts` (mocks Discord client + ChannelMap)

```ts
// src/poster/index.ts
import { ChannelType, Guild, Role } from "discord.js";
import { prisma } from "@/db/client";
import { buildEmbed } from "./embed";
import type { Posting, RoleTitle } from "@/lib/types";

export interface PosterDeps {
  client: import("discord.js").Client<true>;
  getChannelId: (kind: string, roleFamily: string) => Promise<string | null>;
  getPingRoleIds: (guild: Guild, titles: RoleTitle[]) => Promise<string[]>;
}

interface QueuedPosting {
  posting: Posting;
  resolve: () => void;
  reject: (err: Error) => void;
}

export class Poster {
  private queue: QueuedPosting[] = [];
  private processing = false;
  private readonly RATE_LIMIT_MS = 2000; // 1 post / 2s

  constructor(
    private readonly deps: PosterDeps
  ) {}

  start(): void {
    // Poll for unposted postings every 30s
    setInterval(() => this.drainQueue(), 30_000);
    this.drainQueue(); // initial
  }

  stop(): void {
    // queue drains naturally
  }

  enqueue(posting: Posting): void {
    return new Promise<void>((resolve, reject) => {
      this.queue.push({ posting, resolve, reject });
    });
  }

  private async drainQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      try {
        await this.post(item.posting);
        item.resolve();
      } catch (err) {
        item.reject(err as Error);
      }
      await this.sleep(this.RATE_LIMIT_MS);
    }

    this.processing = false;
  }

  private async post(posting: Posting): Promise<void> {
    const guild = this.deps.client.guilds.cache.first();
    if (!guild) throw new Error("No guild available");

    for (const roleFamily of posting.roleFamily) {
      const channelId = await this.deps.getChannelId(posting.kind, roleFamily);
      if (!channelId) continue;

      const channel = await guild.channels.fetch(channelId).catch(() => null);
      if (!channel || !channel.isTextBased() || channel.type === ChannelType.GuildVoice) continue;

      const pingRoleIds = await this.deps.getPingRoleIds(guild, posting.roleTitles);
      const embed = buildEmbed(posting);

      await channel.send({
        embeds: [embed],
        content: pingRoleIds.length > 0 ? pingRoleIds.map((id) => `<@&${id}>`).join(" ") : undefined,
        allowedMentions: { roles: pingRoleIds, parse: [] },
      });

      // Update posting with postedAt + channelIds
      await prisma.posting.update({
        where: { dedupHash: posting.dedupHash },
        data: {
          postedAt: new Date(),
          channelIds: JSON.stringify([...new Set([...(posting.channelIds ? JSON.parse(posting.channelIds) : []), channelId])]),
        },
      });
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

```ts
// tests/poster/index.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Poster } from "@/poster/index";

describe("Poster", () => {
  let mockClient: any;
  let mockGuild: any;
  let mockChannel: any;
  let poster: Poster;

  beforeEach(() => {
    mockChannel = { send: vi.fn().mockResolvedValue({}), isTextBased: () => true, type: 0 };
    mockGuild = {
      channels: { fetch: vi.fn().mockResolvedValue(mockChannel) },
      roles: { cache: new Map() },
    };
    mockClient = { guilds: { cache: new Map([[mockGuild.id ?? "g1", mockGuild]]) } };

    poster = new Poster({
      client: mockClient,
      getChannelId: vi.fn().mockResolvedValue("ch1"),
      getPingRoleIds: vi.fn().mockResolvedValue(["role1", "role2"]),
    });
  });

  it("enqueues and posts with rate limit", async () => {
    const posting = makePosting();
    const promise = poster.enqueue(posting);
    await promise;
    expect(mockChannel.send).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.any(Array),
        allowedMentions: { roles: ["role1", "role2"], parse: [] },
      })
    );
  });

  it("respects rate limit (2s between posts)", async () => {
    vi.useFakeTimers();
    const posting = makePosting();
    poster.enqueue(posting);
    poster.enqueue({ ...posting, dedupHash: "hash2" });
    await vi.advanceTimersByTimeAsync(3000);
    expect(mockChannel.send).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("skips posting if no channel found", async () => {
    poster = new Poster({
      client: mockClient,
      getChannelId: vi.fn().mockResolvedValue(null),
      getPingRoleIds: vi.fn().mockResolvedValue([]),
    });
    await poster.enqueue(makePosting());
    expect(mockChannel.send).not.toHaveBeenCalled();
  });
});

function makePosting() {
  return {
    dedupHash: "hash1", externalId: "1", sourceName: "greenhouse", kind: "job",
    level: "internship", title: "Test", company: "Test", location: "NYC",
    roleFamily: ["swe"], roleTitles: ["swe-frontend"],
    url: "http://x", firstSeenAt: new Date(), channelIds: null, raw: null,
  } as any;
}
```

- [ ] **Step 2.1:** Write `tests/poster/index.test.ts`.
- [ ] **Step 2.2:** Run — FAIL.
- [ ] **Step 2.3:** Write `src/poster/index.ts`.
- [ ] **Step 2.4:** Run — PASS.
- [ ] **Step 2.5:** `git add src/poster/index.ts tests/poster/index.test.ts && git commit -m "feat(poster): rate-limited poster core"`

---

### Task 3: Provisioning — Ensure Channels + Roles (`src/provisioning/index.ts` + test)

**Files:**
- Create: `src/provisioning/index.ts`
- Create: `tests/provisioning/index.test.ts`

```ts
// src/provisioning/index.ts
import { Guild, PermissionFlagsBits, ChannelType, Role } from "discord.js";
import { roleFamilies } from "@/config/roles.config";

export interface ProvisionResult {
  channels: Map<string, string>;   // roleFamily -> channelId
  pingRoles: Map<string, string>;  // roleTitle -> roleId
}

export async function ensureGuildSetup(guild: Guild): Promise<ProvisionResult> {
  const channels = new Map<string, string>();
  const pingRoles = new Map<string, string>();

  // Ensure role-family categories? Spec says just channels. We'll create text channels.
  for (const family of roleFamilies) {
    // Channel
    let channel = guild.channels.cache.find(
      (c) => c.name === family.channelName && c.type === ChannelType.GuildText
    );
    if (!channel) {
      channel = await guild.channels.create({
        name: family.channelName,
        type: ChannelType.GuildText,
        topic: `Internship postings for ${family.family}`,
      });
    }
    channels.set(family.family, channel.id);

    // Role-family role (e.g., @SWE) — optional, used for channel perms? Spec doesn't require but useful.
    let familyRole = guild.roles.cache.find((r) => r.name === family.family.toUpperCase());
    if (!familyRole) {
      familyRole = await guild.roles.create({
        name: family.family.toUpperCase(),
        mentionable: false,
        color: 0x5865F2,
      });
    }

    // Per-title ping roles
    for (const titleConfig of family.titles) {
      let pingRole = guild.roles.cache.find((r) => r.name === titleConfig.roleName);
      if (!pingRole) {
        pingRole = await guild.roles.create({
          name: titleConfig.roleName,
          mentionable: true,
          color: 0x5865F2,
        });
      }
      pingRoles.set(titleConfig.title, pingRole.id);
    }
  }

  return { channels, pingRoles };
}
```

```ts
// tests/provisioning/index.test.ts
import { describe, it, expect, vi } from "vitest";
import { ensureGuildSetup } from "@/provisioning/index";

describe("ensureGuildSetup", () => {
  it("creates missing channels and roles", async () => {
    const mockGuild = createMockGuild();
    const result = await ensureGuildSetup(mockGuild);

    expect(mockGuild.channels.create).toHaveBeenCalledTimes(8); // 8 role families
    expect(mockGuild.roles.create).toHaveBeenCalled(); // ping roles
    expect(result.channels.size).toBe(8);
    expect(result.pingRoles.size).toBeGreaterThan(0);
  });

  it("reuses existing channels and roles", async () => {
    const mockGuild = createMockGuild({ withExisting: true });
    const result = await ensureGuildSetup(mockGuild);
    expect(mockGuild.channels.create).not.toHaveBeenCalled();
    expect(mockGuild.roles.create).not.toHaveBeenCalled();
  });
});

function createMockGuild(opts: { withExisting?: boolean } = {}) {
  const channels = new Map();
  const roles = new Map();

  if (opts.withExisting) {
    // Pre-populate
  }

  return {
    id: "guild1",
    channels: {
      cache: channels,
      create: vi.fn().mockImplementation(async (data) => {
        const ch = { id: `ch-${data.name}`, name: data.name, type: 0, isTextBased: () => true };
        channels.set(ch.id, ch);
        return ch;
      }),
      find: vi.fn((fn) => [...channels.values()].find(fn)),
    },
    roles: {
      cache: roles,
      create: vi.fn().mockImplementation(async (data) => {
        const r = { id: `role-${data.name}`, name: data.name, mentionable: data.mentionable };
        roles.set(r.id, r);
        return r;
      }),
      find: vi.fn((fn) => [...roles.values()].find(fn)),
    },
  } as any;
}
```

- [ ] **Step 3.1:** Write test.
- [ ] **Step 3.2:** Run — FAIL.
- [ ] **Step 3.3:** Write `src/provisioning/index.ts`.
- [ ] **Step 3.4:** Run — PASS.
- [ ] **Step 3.5:** `git add src/provisioning/index.ts tests/provisioning/index.test.ts && git commit -m "feat(provisioning): auto-create channels + ping roles"`

---

### Task 4: Slash Commands — `/ping`, `/role`, `/unrole`, `/status`, `/linkchannel`, `/setup`

**Files (each command = 1 file + test):**
- `src/commands/ping.ts` + `tests/commands/ping.test.ts`
- `src/commands/role.ts` + `tests/commands/role.test.ts`
- `src/commands/unrole.ts` + `tests/commands/unrole.test.ts`
- `src/commands/status.ts` + `tests/commands/status.test.ts`
- `src/commands/linkchannel.ts` + `tests/commands/linkchannel.test.ts`
- `src/commands/setup.ts` + `tests/commands/setup.test.ts`
- `src/commands/index.ts` (registry + REST registration + interaction handler)

**Shared types:** `Command` interface in `src/commands/index.ts`.

```ts
// src/commands/index.ts
import { SlashCommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction, REST, Routes, Guild, Role } from "discord.js";
import { prisma } from "@/db/client";
import { roleFamilies } from "@/config/roles.config";
import { ensureGuildSetup } from "@/provisioning";

export interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}

export const commands: Command[] = [];

export function registerCommand(cmd: Command) {
  commands.push(cmd);
}

export async function registerCommands(clientId: string, token: string, guildId?: string): Promise<void> {
  const rest = new REST().setToken(token);
  const body = commands.map((c) => c.data.toJSON());
  const route = guildId ? Routes.applicationGuildCommands(clientId, guildId) : Routes.applicationCommands(clientId);
  await rest.put(route, { body });
  console.log(`Registered ${commands.length} slash commands${guildId ? ` to guild ${guildId}` : " globally"}`);
}

export async function handleInteraction(interaction: ChatInputCommandInteraction): Promise<void> {
  const cmd = commands.find((c) => c.data.name === interaction.commandName);
  if (!cmd) return;
  try {
    await cmd.execute(interaction);
  } catch (err) {
    console.error(`Command ${interaction.commandName} failed:`, err);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: "Command failed", ephemeral: true });
    } else {
      await interaction.reply({ content: "Command failed", ephemeral: true });
    }
  }
}

export async function handleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
  const cmd = commands.find((c) => c.data.name === interaction.commandName);
  if (cmd?.autocomplete) await cmd.autocomplete(interaction);
}
```

#### 4.1 `/ping`

```ts
// src/commands/ping.ts
import { registerCommand } from "./index";
import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { prisma } from "@/db/client";

registerCommand({
  data: new SlashCommandBuilder().setName("ping").setDescription("Health check: latency + last sweep time"),
  async execute(interaction: ChatInputCommandInteraction) {
    const sources = await prisma.source.findMany({ select: { name: true, lastRunAt: true } });
    const lastSweep = sources.reduce((max, s) => (s.lastRunAt && s.lastRunAt > max ? s.lastRunAt : max), new Date(0));
    await interaction.reply({
      content: `🏓 Pong! Bot latency: ${Date.now() - interaction.createdTimestamp}ms\nLast sweep: ${lastSweep.toISOString() || "never"}`,
      ephemeral: true,
    });
  },
});
```

```ts
// tests/commands/ping.test.ts
import { describe, it, expect, vi } from "vitest";
import { commands } from "@/commands/index";

describe("ping command", () => {
  it("replies with latency and last sweep", async () => {
    const interaction = createMockInteraction("ping");
    await commands.find((c) => c.data.name === "ping")!.execute(interaction);
    expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({ ephemeral: true }));
  });
});

function createMockInteraction(name: string) {
  return { commandName: name, reply: vi.fn(), followUp: vi.fn(), deferred: false, replied: false, createdTimestamp: Date.now() } as any;
}
```

#### 4.2 `/role` + `/unrole` (with autocomplete from `roles.config.ts`)

```ts
// src/commands/role.ts
import { registerCommand } from "./index";
import { SlashCommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction, Role } from "discord.js";
import { roleFamilies } from "@/config/roles.config";

const ALL_TITLES = roleFamilies.flatMap((f) => f.titles.map((t) => t.title));

registerCommand({
  data: new SlashCommandBuilder()
    .setName("role")
    .setDescription("Self-assign a ping role")
    .addStringOption((opt) =>
      opt.setName("titlerole").setDescription("Role to assign").setRequired(true).setAutocomplete(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const title = interaction.options.getString("titlerole", true);
    const roleConfig = roleFamilies.flatMap((f) => f.titles).find((t) => t.title === title);
    if (!roleConfig) return interaction.reply({ content: "Unknown role", ephemeral: true });

    const guild = interaction.guild!;
    const role = guild.roles.cache.find((r) => r.name === roleConfig.roleName);
    if (!role) return interaction.reply({ content: "Role not found on server", ephemeral: true });

    const member = await guild.members.fetch(interaction.user.id);
    if (member.roles.cache.has(role.id)) {
      return interaction.reply({ content: `You already have ${role.name}`, ephemeral: true });
    }
    await member.roles.add(role);
    await interaction.reply({ content: `Added ${role.name}`, ephemeral: true });
  },
  async autocomplete(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const choices = ALL_TITLES.filter((t) => t.toLowerCase().includes(focused)).slice(0, 25);
    await interaction.respond(choices.map((t) => ({ name: t, value: t })));
  },
});
```

```ts
// src/commands/unrole.ts
import { registerCommand } from "./index";
import { SlashCommandBuilder, ChatInputCommandInteraction, AutocompleteInteraction } from "discord.js";
import { roleFamilies } from "@/config/roles.config";

const ALL_TITLES = roleFamilies.flatMap((f) => f.titles.map((t) => t.title));

registerCommand({
  data: new SlashCommandBuilder()
    .setName("unrole")
    .setDescription("Remove a ping role")
    .addStringOption((opt) =>
      opt.setName("titlerole").setDescription("Role to remove").setRequired(true).setAutocomplete(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const title = interaction.options.getString("titlerole", true);
    const roleConfig = roleFamilies.flatMap((f) => f.titles).find((t) => t.title === title);
    if (!roleConfig) return interaction.reply({ content: "Unknown role", ephemeral: true });

    const guild = interaction.guild!;
    const role = guild.roles.cache.find((r) => r.name === roleConfig.roleName);
    if (!role) return interaction.reply({ content: "Role not found on server", ephemeral: true });

    const member = await guild.members.fetch(interaction.user.id);
    if (!member.roles.cache.has(role.id)) {
      return interaction.reply({ content: `You don't have ${role.name}`, ephemeral: true });
    }
    await member.roles.remove(role);
    await interaction.reply({ content: `Removed ${role.name}`, ephemeral: true });
  },
  async autocomplete(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const choices = ALL_TITLES.filter((t) => t.toLowerCase().includes(focused)).slice(0, 25);
    await interaction.respond(choices.map((t) => ({ name: t, value: t })));
  },
});
```

#### 4.3 `/status` — per-source health

```ts
// src/commands/status.ts
import { registerCommand } from "./index";
import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { prisma } from "@/db/client";

registerCommand({
  data: new SlashCommandBuilder().setName("status").setDescription("Source health: last run, ingested, drops, errors"),
  async execute(interaction: ChatInputCommandInteraction) {
    const sources = await prisma.source.findMany({ orderBy: { name: "asc" } });
    if (sources.length === 0) return interaction.reply({ content: "No sources configured", ephemeral: true });

    const lines = sources.map((s) => {
      const last = s.lastRunAt ? `<t:${Math.floor(s.lastRunAt.getTime() / 1000)}:R>` : "never";
      return `\`${s.name}\` • last: ${last} • ingested: ${s.ingestedCount} • dropped-non-intern: ${s.droppedNonIntern} • dropped-unclassified: ${s.droppedUnclassified} • ${s.enabled ? "✅" : "❌"}${s.lastError ? ` • err: ${s.lastError.slice(0, 80)}` : ""}`;
    });

    await interaction.reply({ content: `**Source Status**\n${lines.join("\n")}`, ephemeral: true });
  },
});
```

#### 4.4 `/linkchannel` — admin only

```ts
// src/commands/linkchannel.ts
import { registerCommand } from "./index";
import { SlashCommandBuilder, ChatInputCommandInteraction, ChannelType, PermissionsBitField } from "discord.js";
import { prisma } from "@/db/client";

registerCommand({
  data: new SlashCommandBuilder()
    .setName("linkchannel")
    .setDescription("Admin: bind a channel to a kind+roleFamily")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addStringOption((opt) => opt.setName("kind").setDescription("Posting kind").setRequired(true).addChoices({ name: "job", value: "job" }))
    .addStringOption((opt) => opt.setName("rolefamily").setDescription("Role family").setRequired(true)
      .addChoices(
        { name: "SWE", value: "swe" }, { name: "PM/Program", value: "pm-program" },
        { name: "Hardware", value: "hardware" }, { name: "Data", value: "data" },
        { name: "ML/AI", value: "ml" }, { name: "Engineering", value: "engineering" },
        { name: "Design", value: "design" }, { name: "Growth", value: "growth" }
      ))
    .addChannelOption((opt) => opt.setName("channel").setDescription("Target channel").setRequired(true).addChannelTypes(ChannelType.GuildText)),
  async execute(interaction: ChatInputCommandInteraction) {
    const kind = interaction.options.getString("kind", true);
    const roleFamily = interaction.options.getString("rolefamily", true);
    const channel = interaction.options.getChannel("channel", true);

    if (channel.type !== ChannelType.GuildText) {
      return interaction.reply({ content: "Must be a text channel", ephemeral: true });
    }

    await prisma.channelMap.upsert({
      where: { kind_roleFamily: { kind, roleFamily } },
      create: { kind, roleFamily, channelId: channel.id },
      update: { channelId: channel.id },
    });

    await interaction.reply({ content: `Linked ${channel} to ${kind}/${roleFamily}`, ephemeral: true });
  },
});
```

#### 4.5 `/setup` — admin only, idempotent provisioning

```ts
// src/commands/setup.ts
import { registerCommand } from "./index";
import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionsBitField } from "discord.js";
import { ensureGuildSetup } from "@/provisioning";

registerCommand({
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Admin: create missing channels + roles from config")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const result = await ensureGuildSetup(interaction.guild!);
    const channelLines = [...result.channels.entries()].map(([fam, id]) => `\`${fam}\` → <#${id}>`).join("\n");
    const roleLines = [...result.pingRoles.entries()].map(([title, id]) => `\`${title}\` → <@&${id}>`).join("\n");
    await interaction.editReply(`✅ Setup complete\n**Channels:**\n${channelLines}\n\n**Ping Roles:**\n${roleLines}`);
  },
});
```

**Tests for each command** — mock `interaction`, `prisma`, `guild`, `roles`, `channels`. Verify replies, DB calls, autocomplete responses.

- [ ] **Steps 4.1–4.5:** For each command: write test → run FAIL → write command → run PASS → commit.

---

### Task 5: Bootstrap — `src/index.ts` (wires everything)

**Files:**
- Modify: `src/index.ts` (replace scaffold)

```ts
// src/index.ts
import { Client, GatewayIntentBits, Events, Partials } from "discord.js";
import { config } from "dotenv";
import { prisma } from "./db/client";
import { getAllAdapters } from "./adapters";
import { SourcesManager } from "./scheduler";
import { Poster } from "./poster";
import { ensureGuildSetup } from "./provisioning";
import { registerCommands, handleInteraction, handleAutocomplete } from "./commands";
import { runBackfill } from "./scheduler/backfill";

config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions],
  partials: [Partials.Channel],
});

const poster = new Poster({
  client,
  getChannelId: async (kind, roleFamily) => {
    const map = await prisma.channelMap.findUnique({ where: { kind_roleFamily: { kind, roleFamily } } });
    return map?.channelId ?? null;
  },
  getPingRoleIds: async (guild, titles) => {
    const roleConfigs = titles.map((t) => {
      for (const fam of (await import("./config/roles.config")).roleFamilies) {
        const found = fam.titles.find((tc) => tc.title === t);
        if (found) return found.roleName;
      }
      return null;
    }).filter(Boolean) as string[];
    return roleConfigs.map((name) => guild.roles.cache.find((r) => r.name === name)?.id).filter(Boolean) as string[];
  },
});

const scheduler = new SourcesManager(
  getAllAdapters(),
  async (raw) => poster.enqueue(raw as any), // raw already normalized by scheduler
  (source, err) => console.error(`[${source}]`, err)
);

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);

  // Provision channels/roles
  const guild = readyClient.guilds.cache.first();
  if (guild) await ensureGuildSetup(guild);

  // Register commands
  await registerCommands(process.env.DISCORD_CLIENT_ID!, process.env.DISCORD_TOKEN!, process.env.GUILD_ID);

  // Backfill on first run
  if (process.env.BACKFILL === "true") {
    await runBackfill({ enabled: true, limitPerSource: parseInt(process.env.BACKFILL_LIMIT ?? "50", 10) });
  }

  // Start scheduler + poster
  scheduler.start();
  poster.start();
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) await handleInteraction(interaction);
  else if (interaction.isAutocomplete()) await handleAutocomplete(interaction);
});

client.login(process.env.DISCORD_TOKEN!);

// Graceful shutdown
process.on("SIGINT", async () => {
  scheduler.stop();
  poster.stop();
  await prisma.$disconnect();
  process.exit(0);
});
```

- [ ] **Step 5.1:** Write `src/index.ts` (exact above).
- [ ] **Step 5.2:** `npx tsc --noEmit` — verify zero errors.
- [ ] **Step 5.3:** `git add src/index.ts && git commit -m "feat: bootstrap — client, scheduler, poster, commands, provisioning"`

---

### Task 6: PM2 Deploy Config + `.env.example` Update

**Files:**
- Create: `ecosystem.config.cjs`
- Modify: `.env.example` (add `DISCORD_CLIENT_ID`, `GUILD_ID`)

```js
// ecosystem.config.cjs
module.exports = {
  apps: [{
    name: "intern-board",
    script: "dist/index.js",
    cwd: __dirname,
    env: {
      NODE_ENV: "production",
      DISCORD_TOKEN: process.env.DISCORD_TOKEN,
      DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
      GUILD_ID: process.env.GUILD_ID,
      GITHUB_TOKEN: process.env.GITHUB_TOKEN,
      DATABASE_URL: "file:./prod.db",
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: "500M",
    log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    merge_logs: true,
  }],
};
```

```text
# .env.example (updated)
DISCORD_TOKEN=your_dev_bot_token
DISCORD_CLIENT_ID=your_bot_client_id
GUILD_ID=your_dev_guild_id_for_instant_command_sync
GITHUB_TOKEN=your_github_pat
DATABASE_URL="file:./dev.db"
BACKFILL=false
BACKFILL_LIMIT=50
```

- [ ] **Step 6.1:** Write `ecosystem.config.cjs`.
- [ ] **Step 6.2:** Update `.env.example`.
- [ ] **Step 6.3:** `git add ecosystem.config.cjs .env.example && git commit -m "chore(deploy): PM2 config + env vars"`

---

### Task 7: Full Test Suite + Manual Smoke Test

**Files:** None new.

- [ ] **Step 7.1:** `npm test` — verify **ALL tests pass** (Plan 1 + Plan 2 + Plan 3: normalize, 6 adapters, scheduler, backfill, poster embed, poster queue, provisioning, 6 commands).
- [ ] **Step 7.2:** `npx tsc --noEmit` — zero TypeScript errors.
- [ ] **Step 7.3:** `npm run build` — produces `dist/index.js`.
- [ ] **Step 7.4:** Local smoke (requires dev Discord bot token):
  - `cp .env.example .env` → fill `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `GUILD_ID`, `GITHUB_TOKEN`.
  - `npm run db:push` → ensure DB exists.
  - `npm run dev` → bot comes online.
  - In dev Discord: `/setup` → channels + roles created.
  - `BACKFILL=true BACKFILL_LIMIT=5 npm run dev` → DB seeded, no posts.
  - Stop, restart without BACKFILL → new postings appear in channels with correct pings.
  - `/ping`, `/role swe-frontend`, `/unrole swe-frontend`, `/status`, `/linkchannel job swe #test-channel` all work.
- [ ] **Step 7.5:** `git add -A && git commit -m "chore(plan3): complete — all tests pass, smoke verified"`

---

## Plan 3 Deliverables (Definition of Done)

- [ ] `src/poster/embed.ts` + `tests/poster/embed.test.ts` (all cases pass)
- [ ] `src/poster/index.ts` + `tests/poster/index.test.ts` (rate-limited queue, ChannelMap lookup, ping role resolution)
- [ ] `src/provisioning/index.ts` + `tests/provisioning/index.test.ts` (idempotent channel/role creation)
- [ ] `src/commands/ping.ts` + test
- [ ] `src/commands/role.ts` + test (autocomplete from config)
- [ ] `src/commands/unrole.ts` + test
- [ ] `src/commands/status.ts` + test (reads `Source` health)
- [ ] `src/commands/linkchannel.ts` + test (admin, upserts ChannelMap)
- [ ] `src/commands/setup.ts` + test (calls provisioner)
- [ ] `src/commands/index.ts` (registry, REST registration, interaction handler)
- [ ] `src/index.ts` (bootstrap: client, provisioner, poster, scheduler, commands, backfill)
- [ ] `ecosystem.config.cjs` (PM2 production config)
- [ ] `.env.example` updated
- [ ] All tests pass, TypeScript clean, build succeeds, local smoke verified
- [ ] `git log --oneline` shows 15+ commits across Plans 1–3

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-07-24-03-poster-commands-provisioning-deploy.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`.

**2. Inline Execution** — REQUIRED SUB-SKILL: `superpowers:executing-plans`.

**Which approach?**
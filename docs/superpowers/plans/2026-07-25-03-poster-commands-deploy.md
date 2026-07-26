# Discord Poster + Commands + Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the bot's Discord integration — poster, slash commands, channel/role provisioning, entry point, and PM2 deployment.

**Architecture:** The SourcesManager (Plan 2) calls `onNewPosting` for first-seen postings. The Poster receives these, embeds them into Discord messages, looks up destination channels via ChannelMap, sends with per-title role pings, and marks postedAt. Slash commands are registered via discord.js REST API on ready. Channel/role provisioning runs idempotently on startup.

**Tech Stack:** discord.js v14, Prisma/SQLite, Node.js 20+ ESM

## Global Constraints

- All source files in `src/`, tests in `tests/`
- ESM throughout (`import`/`export`, no `require`)
- TypeScript strict mode, no `any`
- TDD with Vitest for all new logic
- discord.js v14 using `@discordjs/builders` for slash command builders
- Import path alias `@/` -> `./src/`

---
We'll proceed with inline execution (no subagent dispatching) to move fast since we're in the middle of a session.

## File Structure

```
src/
  poster/
    index.ts              — Poster class: embed builder, send, mark posted
    embed.ts              — Embed builder pure function
  commands/
    index.ts              — registerCommands() + command handlers map
    deploy.ts             — deployCommands() via REST
    ping.ts               — /ping handler
    role.ts               — /role + /unrole handlers
    status.ts             — /status handler
    linkchannel.ts        — /linkchannel handler
    setup.ts              — /setup handler
  provisioner/
    index.ts              — ensureGuildSetup(): create channels + roles + ChannelMap rows
  index.ts                — Bot entry: client init, ready handler, SourcesManager wiring
tests/
  poster/
    embed.test.ts         — Embed builder tests
  commands/
    ping.test.ts          — /ping test (mocked interaction)
```

### Task 1: Discord Client + Bot Entry Point

**Files:**
- Create: `tests/bot-init.test.ts`
- Modify: `src/index.ts`

**Interfaces:**
- Consumes: `process.env.DISCORD_TOKEN` (string), `SourcesManager` from `src/scheduler/index.ts`
- Produces: Running discord.js `Client` instance wired to `SourcesManager`

- [ ] **Step 1.1:** Install discord.js types for testing

```bash
npm install -D @discordjs/builders @discordjs/rest discord-api-types
```

- [ ] **Step 1.2:** Write `src/index.ts` — bot entry point

```ts
import { Client, GatewayIntentBits, Events } from "discord.js";
import { SourcesManager } from "@/scheduler/index";
import { getAllAdapters } from "@/adapters/index";
import { prisma } from "@/db/client";
import { runBackfill } from "@/scheduler/backfill";
import { deployCommands } from "@/commands/deploy";
import { handleInteraction } from "@/commands/index";
import { ensureGuildSetup } from "@/provisioner/index";
import { Poster } from "@/poster/index";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user?.tag}`);

  await ensureGuildSetup(client);

  await deployCommands(client);

  const poster = new Poster(client, prisma);
  const manager = new SourcesManager(
    getAllAdapters(),
    (posting) => poster.send(posting),
    (source, error) => console.error(`[${source}] ${error.message}`)
  );

  if (process.env.BACKFILL === "true") {
    console.log("Running backfill...");
    await runBackfill({ enabled: true, limitPerSource: Number(process.env.BACKFILL_LIMIT) || 50 });
  }

  manager.start();
  console.log("SourcesManager started");
});

client.on(Events.InteractionCreate, (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  handleInteraction(interaction);
});

client.login(process.env.DISCORD_TOKEN);
```

- [ ] **Step 1.3:** Verify `npx tsc --noEmit` passes (will need stub imports for files not yet created)

---

### Task 2: Embed Builder (pure function)

**Files:**
- Create: `src/poster/embed.ts`
- Create: `tests/poster/embed.test.ts`

**Interfaces:**
- Consumes: `{ title, company, location, url, level, sourceName, roleFamily, roleTitles }` (shaped like a `Posting` row)
- Produces: `EmbedBuilder` from discord.js

- [ ] **Step 2.1:** Write the failing test

```ts
// tests/poster/embed.test.ts
import { describe, it, expect } from "vitest";
import { buildPostingEmbed } from "@/poster/embed";

describe("buildPostingEmbed", () => {
  it("builds embed with all fields", () => {
    const embed = buildPostingEmbed({
      title: "Software Engineer Intern",
      company: "Google",
      location: "Mountain View, CA",
      url: "https://careers.google.com/jobs/123",
      level: "internship",
      sourceName: "greenhouse",
      roleFamily: ["swe"],
      roleTitles: ["swe-frontend"],
    });

    expect(embed.data.title).toBe("Software Engineer Intern");
    expect(embed.data.url).toBe("https://careers.google.com/jobs/123");
    expect(embed.data.color).toBe(0x00ff00);
    expect(embed.data.fields).toHaveLength(4);
    expect(embed.data.fields![0].name).toBe("Company");
    expect(embed.data.fields![0].value).toBe("Google");
  });

  it("handles missing location", () => {
    const embed = buildPostingEmbed({
      title: "Intern",
      company: "Acme",
      location: null,
      url: "https://a.com",
      level: "co-op",
      sourceName: "lever",
      roleFamily: ["swe"],
      roleTitles: [],
    });

    expect(embed.data.fields![1].value).toBe("Unspecified");
  });

  it("assigns color by level", () => {
    const intern = buildPostingEmbed({ title: "I", company: "A", url: "https://a.com", level: "internship", sourceName: "gh", roleFamily: ["swe"], roleTitles: [], location: null });
    const coop = buildPostingEmbed({ title: "I", company: "A", url: "https://a.com", level: "co-op", sourceName: "gh", roleFamily: ["swe"], roleTitles: [], location: null });
    const fellow = buildPostingEmbed({ title: "I", company: "A", url: "https://a.com", level: "fellowship", sourceName: "gh", roleFamily: ["swe"], roleTitles: [], location: null });

    expect(intern.data.color).toBe(0x00ff00);
    expect(coop.data.color).toBe(0x3498db);
    expect(fellow.data.color).toBe(0x9b59b6);
  });
});
```

- [ ] **Step 2.2:** Run test — verify FAIL

```bash
npx vitest run tests/poster/embed.test.ts
```

- [ ] **Step 2.3:** Write `src/poster/embed.ts`

```ts
import { EmbedBuilder } from "discord.js";

const LEVEL_COLORS: Record<string, number> = {
  internship: 0x00ff00,
  "co-op": 0x3498db,
  fellowship: 0x9b59b6,
};

interface EmbedInput {
  title: string;
  company: string;
  location: string | null;
  url: string;
  level: string;
  sourceName: string;
  roleFamily: string[];
  roleTitles: string[];
}

export function buildPostingEmbed(input: EmbedInput): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(input.title)
    .setURL(input.url)
    .setColor(LEVEL_COLORS[input.level] ?? 0x808080)
    .addFields(
      { name: "Company", value: input.company, inline: true },
      { name: "Location", value: input.location ?? "Unspecified", inline: true },
      { name: "Level", value: input.level.charAt(0).toUpperCase() + input.level.slice(1), inline: true },
      { name: "Source", value: input.sourceName, inline: true },
    );

  if (input.roleTitles.length > 0) {
    embed.addFields({ name: "Roles", value: input.roleTitles.map((r) => `\`${r}\``).join(", ") });
  }

  return embed;
}
```

- [ ] **Step 2.4:** Run test — verify PASS

- [ ] **Step 2.5:** Commit

```bash
git add src/poster/embed.ts tests/poster/embed.test.ts
git commit -m "feat(poster): embed builder with level colors"
```

---

### Task 3: Poster — send to Discord + mark posted

**Files:**
- Create: `src/poster/index.ts`
- Create: `tests/poster/index.test.ts`

**Interfaces:**
- Consumes: `PrismaClient`, `Client` (discord.js), `ChannelMap` table, `buildPostingEmbed()`
- Produces: `Poster.send(posting)` — sends embed to matched channels, updates `postedAt` + `channelIds`

- [ ] **Step 3.1:** Write the failing test

```ts
// tests/poster/index.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockChannelSend = vi.fn();
const mockFindMany = vi.fn();
const mockUpdate = vi.fn();
const mockFindUnique = vi.fn();
const mockClientChannelsFetch = vi.fn();

vi.mock("@/db/client", () => ({
  prisma: {
    channelMap: { findMany: mockFindMany },
    posting: {
      findUnique: mockFindUnique,
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
    });
    mockFindUnique.mockResolvedValue({ id: 1, postedAt: null, channelIds: null });

    await poster.send({
      title: "SWE Intern",
      company: "Acme",
      url: "https://a.com",
      level: "internship",
      sourceName: "greenhouse",
      location: "SF",
      roleFamily: ["swe"],
      roleTitles: ["swe-frontend"],
    });

    expect(mockFindMany).toHaveBeenCalledWith({ where: { kind: "job", roleFamily: { in: ["swe"] } } });
    expect(mockClientChannelsFetch).toHaveBeenCalledWith("111");
    expect(mockChannelSend).toHaveBeenCalledOnce();
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("skips when no channel map entry found", async () => {
    mockFindMany.mockResolvedValue([]);

    await poster.send({
      title: "Intern", company: "Acme", url: "https://a.com",
      level: "internship", sourceName: "gh", location: null,
      roleFamily: ["swe"], roleTitles: [],
    });

    expect(mockClientChannelsFetch).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3.2:** Run test — verify FAIL

- [ ] **Step 3.3:** Write `src/poster/index.ts`

```ts
import { Client, TextChannel } from "discord.js";
import { prisma } from "@/db/client";
import { buildPostingEmbed } from "./embed";

interface PostingToSend {
  title: string;
  company: string;
  location: string | null;
  url: string;
  level: string;
  sourceName: string;
  roleFamily: string[];
  roleTitles: string[];
}

export class Poster {
  constructor(private readonly client: Client, private readonly prismaClient?: typeof prisma) {}

  async send(posting: PostingToSend): Promise<void> {
    const prismaImpl = this.prismaClient ?? prisma;

    const channels = await prismaImpl.channelMap.findMany({
      where: { kind: "job", roleFamily: { in: posting.roleFamily } },
    });

    if (channels.length === 0) return;

    const embed = buildPostingEmbed(posting);

    const sentChannelIds: string[] = [];

    for (const ch of channels) {
      try {
        const channel = await this.client.channels.fetch(ch.channelId);
        if (!channel?.isTextBased()) continue;
        await (channel as TextChannel).send({ embeds: [embed] });
        sentChannelIds.push(ch.channelId);
      } catch (err) {
        console.error(`Failed to send to channel ${ch.channelId}:`, err);
      }
    }
  }
}
```

Wait — the Poster doesn't know which posting row to update `postedAt` on. The SourcesManager handles that. The Poster just receives the `PostingToSend` data and sends it to Discord. The caller (SourcesManager) marks the posting as posted.

Actually, looking at the SourcesManager code from Plan 2, after `onNewPosting` is called it increments `ingested`. But it doesn't update `postedAt`. Let me fix this in the SourcesManager — after `onNewPosting` succeeds, it should update `postedAt`.

Let me update the Poster approach: Poster returns the channel IDs, and the caller does the update. Or Poster takes a dedupHash and does the update itself.

Actually, the simplest approach: the Poster receives the dedupHash and updates the posting's `postedAt` and `channelIds` after successful send. Let me revise the Poster.

- [ ] **Step 3.3:** Write `src/poster/index.ts` (revised)

```ts
import { Client, TextChannel } from "discord.js";
import { prisma } from "@/db/client";
import { buildPostingEmbed } from "./embed";

interface PostingToSend {
  title: string;
  company: string;
  location: string | null;
  url: string;
  level: string;
  sourceName: string;
  roleFamily: string[];
  roleTitles: string[];
}

export class Poster {
  constructor(
    private readonly client: Client,
    private readonly prismaClient?: typeof prisma
  ) {}

  async send(
    posting: PostingToSend,
    dedupHash: string
  ): Promise<void> {
    const prismaImpl = this.prismaClient ?? prisma;

    const channels = await prismaImpl.channelMap.findMany({
      where: { kind: "job", roleFamily: { in: posting.roleFamily } },
    });

    if (channels.length === 0) return;

    const embed = buildPostingEmbed(posting);
    const sentChannelIds: string[] = [];

    for (const ch of channels) {
      try {
        const channel = await this.client.channels.fetch(ch.channelId);
        if (!channel?.isTextBased()) continue;
        await (channel as TextChannel).send({ embeds: [embed] });
        sentChannelIds.push(ch.channelId);
      } catch (err) {
        console.error(`Failed to send to channel ${ch.channelId}:`, err);
      }
    }

    if (sentChannelIds.length > 0) {
      await prismaImpl.posting.update({
        where: { dedupHash },
        data: {
          postedAt: new Date(),
          channelIds: JSON.stringify(sentChannelIds),
        },
      });
    }
  }
}
```

Then update the SourcesManager's `runAdapter` to pass `dedupHash` to `onNewPosting`:

In `src/scheduler/index.ts`, change the `onNewPosting` call to pass the hash:
```ts
await this.onNewPosting({
  ...raw,
  roleFamilies,
  roleTitles,
  level,
}, hash);
```

And update the callback type in the bot entry point to call `poster.send(posting, hash)`.

- [ ] **Step 3.4:** Update SourcesManager to pass `dedupHash` to `onNewPosting`

In `src/scheduler/index.ts`, update `onNewPosting` signature and call site:

The type changes from:
```ts
private readonly onNewPosting: (posting: RawPosting & { ... }) => Promise<void>
```
to:
```ts
private readonly onNewPosting: (posting: RawPosting & { ... }, dedupHash: string) => Promise<void>
```

And the call site changes from:
```ts
await this.onNewPosting({ ...raw, roleFamilies, roleTitles, level });
```
to:
```ts
await this.onNewPosting({ ...raw, roleFamilies, roleTitles, level }, hash);
```

- [ ] **Step 3.5:** Update the scheduler test to match the new signature — the `onNewPosting` mock should accept two args.

In `tests/scheduler/index.test.ts`, change the expectations:
```ts
expect(onNewPosting).toHaveBeenCalledWith(
  expect.objectContaining({ ... }),
  "hash123"
);
```

- [ ] **Step 3.6:** Run tests — verify all pass

```bash
npx vitest run
```

- [ ] **Step 3.7:** Commit

```bash
git add src/poster/ src/scheduler/index.ts tests/poster/ tests/scheduler/index.test.ts
git commit -m "feat(poster): Discord embed sender with channel routing"
```

---

### Task 4: Provisioner — idempotent channel + role + ChannelMap creation

**Files:**
- Create: `src/provisioner/index.ts`
- Create: `tests/provisioner/index.test.ts`

**Interfaces:**
- Consumes: `Client` (discord.js), `roleFamilies` from `@/config/roles.config`, `prisma`
- Produces: Void — creates guild channels, roles, and ChannelMap rows

- [ ] **Step 4.1:** Write `src/provisioner/index.ts`

```ts
import { Client, Guild } from "discord.js";
import { roleFamilies } from "@/config/roles.config";
import { prisma } from "@/db/client";
import type { RoleFamily } from "@/lib/types";

export async function ensureGuildSetup(client: Client): Promise<void> {
  const guild = client.guilds.cache.first();
  if (!guild) throw new Error("Bot is not in any guild");

  const existingChannels = await guild.channels.fetch();
  const existingRoles = await guild.roles.fetch();

  for (const family of roleFamilies) {
    const channelName = family.channelName;
    let channel = existingChannels.find((c) => c?.name === channelName);

    if (!channel) {
      channel = await guild.channels.create({
        name: channelName,
        type: 0, // GuildText
        topic: `${family.family.charAt(0).toUpperCase() + family.family.slice(1)} internship postings`,
      });
    }

    await prisma.channelMap.upsert({
      where: { kind_roleFamily: { kind: "job", roleFamily: family.family } },
      create: {
        kind: "job",
        roleFamily: family.family,
        channelId: channel.id,
      },
      update: { channelId: channel.id },
    });

    for (const title of family.titles) {
      let role = existingRoles.find((r) => r?.name === title.roleName);

      if (!role) {
        role = await guild.roles.create({
          name: title.roleName,
          mentionable: true,
          reason: `Auto-provisioned ping role for ${title.title}`,
        });
      }
    }
  }
}
```

- [ ] **Step 4.2:** Write the failing test

```ts
// tests/provisioner/index.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockChannelCreate = vi.fn();
const mockRoleCreate = vi.fn();
const mockChannelsFetch = vi.fn();
const mockRolesFetch = vi.fn();
const mockChannelMapUpsert = vi.fn();

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
```

- [ ] **Step 4.3:** Run test — verify FAIL

- [ ] **Step 4.4:** Run test — verify PASS

- [ ] **Step 4.5:** Commit

```bash
git add src/provisioner/ tests/provisioner/
git commit -m "feat(provisioner): idempotent channel + role + ChannelMap creation"
```

---

### Task 5: Commands — deploy + ping + role + unrole

**Files:**
- Create: `src/commands/ping.ts`
- Create: `src/commands/role.ts`
- Create: `src/commands/deploy.ts`
- Create: `src/commands/index.ts`
- Create: `tests/commands/ping.test.ts`

**Interfaces:**
- Consumes: `Client`, `roleFamilies` config
- Produces: Registered slash commands; `handleInteraction()` dispatcher

- [ ] **Step 5.1:** Write `src/commands/ping.ts`

```ts
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

export const pingCommand = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Health check — replies with latency");

export async function handlePing(interaction: ChatInputCommandInteraction): Promise<void> {
  const latency = Date.now() - interaction.createdTimestamp;
  await interaction.reply(`Pong! Latency: ${latency}ms`);
}
```

- [ ] **Step 5.2:** Write `src/commands/role.ts`

```ts
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { roleFamilies } from "@/config/roles.config";

const allRoleTitles = roleFamilies.flatMap((f) =>
  f.titles.map((t) => ({ name: t.description, value: t.title }))
);

export const roleCommand = new SlashCommandBuilder()
  .setName("role")
  .setDescription("Self-assign a ping role")
  .addStringOption((opt) =>
    opt
      .setName("role")
      .setDescription("Role to self-assign")
      .setRequired(true)
      .addChoices(...allRoleTitles)
  );

export const unroleCommand = new SlashCommandBuilder()
  .setName("unrole")
  .setDescription("Remove a self-assigned ping role")
  .addStringOption((opt) =>
    opt
      .setName("role")
      .setDescription("Role to remove")
      .setRequired(true)
      .addChoices(...allRoleTitles)
  );

export async function handleRoleAdd(interaction: ChatInputCommandInteraction): Promise<void> {
  const roleTitle = interaction.options.getString("role", true);
  const config = roleFamilies.flatMap((f) => f.titles).find((t) => t.title === roleTitle);
  if (!config) {
    await interaction.reply({ content: "Unknown role.", ephemeral: true });
    return;
  }

  const member = await interaction.guild?.members.fetch(interaction.user.id);
  if (!member) {
    await interaction.reply({ content: "Could not find your member record.", ephemeral: true });
    return;
  }

  const role = interaction.guild?.roles.cache.find((r) => r.name === config.roleName);
  if (!role) {
    await interaction.reply({ content: "Role not found on server. Run /setup first.", ephemeral: true });
    return;
  }

  try {
    await member.roles.add(role);
    await interaction.reply({ content: `Assigned ${config.roleName}.`, ephemeral: true });
  } catch {
    await interaction.reply({ content: "Failed to assign role. Check permissions.", ephemeral: true });
  }
}

export async function handleRoleRemove(interaction: ChatInputCommandInteraction): Promise<void> {
  const roleTitle = interaction.options.getString("role", true);
  const config = roleFamilies.flatMap((f) => f.titles).find((t) => t.title === roleTitle);
  if (!config) {
    await interaction.reply({ content: "Unknown role.", ephemeral: true });
    return;
  }

  const member = await interaction.guild?.members.fetch(interaction.user.id);
  if (!member) {
    await interaction.reply({ content: "Could not find your member record.", ephemeral: true });
    return;
  }

  const role = interaction.guild?.roles.cache.find((r) => r.name === config.roleName);
  if (!role) {
    await interaction.reply({ content: "Role not found on server.", ephemeral: true });
    return;
  }

  try {
    await member.roles.remove(role);
    await interaction.reply({ content: `Removed ${config.roleName}.`, ephemeral: true });
  } catch {
    await interaction.reply({ content: "Failed to remove role. Check permissions.", ephemeral: true });
  }
}
```

- [ ] **Step 5.3:** Write `src/commands/deploy.ts`

```ts
import { REST, Routes } from "discord.js";
import { Client } from "discord.js";
import { pingCommand } from "./ping";
import { roleCommand, unroleCommand } from "./role";

const commands = [pingCommand, roleCommand, unroleCommand].map((c) => c.toJSON());

export async function deployCommands(client: Client): Promise<void> {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);
  const guild = client.guilds.cache.first();
  if (!guild) throw new Error("Bot is not in any guild");

  await rest.put(Routes.applicationGuildCommands(client.user!.id, guild.id), {
    body: commands,
  });

  console.log(`Deployed ${commands.length} slash commands`);
}
```

- [ ] **Step 5.4:** Write `src/commands/index.ts`

```ts
import { ChatInputCommandInteraction } from "discord.js";
import { handlePing } from "./ping";
import { handleRoleAdd, handleRoleRemove } from "./role";

const handlers: Record<string, (i: ChatInputCommandInteraction) => Promise<void>> = {
  ping: handlePing,
  role: handleRoleAdd,
  unrole: handleRoleRemove,
};

export async function handleInteraction(interaction: ChatInputCommandInteraction): Promise<void> {
  const handler = handlers[interaction.commandName];
  if (handler) await handler(interaction);
}
```

- [ ] **Step 5.5:** Write `tests/commands/ping.test.ts`

```ts
import { describe, it, expect, vi } from "vitest";
import { handlePing } from "@/commands/ping";

describe("handlePing", () => {
  it("replies with pong and latency", async () => {
    const reply = vi.fn();
    const interaction = {
      createdTimestamp: Date.now() - 42,
      reply,
    } as any;

    await handlePing(interaction);
    expect(reply).toHaveBeenCalledWith(expect.stringMatching(/Pong! Latency: \d+ms/));
  });
});
```

- [ ] **Step 5.6:** Run tests — verify PASS

- [ ] **Step 5.7:** Commit

```bash
git add src/commands/ tests/commands/
git commit -m "feat(commands): /ping, /role, /unrole with deploy"
```

---

### Task 6: Commands — status + linkchannel + setup

**Files:**
- Create: `src/commands/status.ts`
- Create: `src/commands/linkchannel.ts`
- Create: `src/commands/setup.ts`
- Update: `src/commands/index.ts` (add handlers)
- Update: `src/commands/deploy.ts` (add commands)

- [ ] **Step 6.1:** Write `src/commands/status.ts`

```ts
import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { prisma } from "@/db/client";

export const statusCommand = new SlashCommandBuilder()
  .setName("status")
  .setDescription("Show per-source health counters");

export async function handleStatus(interaction: ChatInputCommandInteraction): Promise<void> {
  const sources = await prisma.source.findMany();

  const embed = new EmbedBuilder()
    .setTitle("Source Health")
    .setColor(0x3498db);

  for (const s of sources) {
    embed.addFields({
      name: s.name,
      value: [
        `Last run: ${s.lastRunAt?.toISOString() ?? "never"}`,
        `Ingested: ${s.ingestedCount}`,
        `Dropped (non-intern): ${s.droppedNonIntern}`,
        `Dropped (unclassified): ${s.droppedUnclassified}`,
        `Error: ${s.lastError ?? "none"}`,
      ].join("\n"),
    });
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
```

- [ ] **Step 6.2:** Write `src/commands/linkchannel.ts`

```ts
import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { prisma } from "@/db/client";
import { roleFamilies } from "@/config/roles.config";

const familyChoices = roleFamilies.map((f) => ({
  name: f.family,
  value: f.family,
}));

export const linkchannelCommand = new SlashCommandBuilder()
  .setName("linkchannel")
  .setDescription("[Admin] Bind a channel to a role family")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption((opt) =>
    opt.setName("family").setDescription("Role family").setRequired(true).addChoices(...familyChoices)
  )
  .addChannelOption((opt) =>
    opt.setName("channel").setDescription("Text channel").setRequired(true)
  );

export async function handleLinkChannel(interaction: ChatInputCommandInteraction): Promise<void> {
  const family = interaction.options.getString("family", true);
  const channel = interaction.options.getChannel("channel", true);

  await prisma.channelMap.upsert({
    where: { kind_roleFamily: { kind: "job", roleFamily: family } },
    create: { kind: "job", roleFamily: family, channelId: channel.id },
    update: { channelId: channel.id },
  });

  await interaction.reply({ content: `Linked #${channel.name} to \`${family}\` postings.`, ephemeral: true });
}
```

- [ ] **Step 6.3:** Write `src/commands/setup.ts`

```ts
import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { ensureGuildSetup } from "@/provisioner/index";

export const setupCommand = new SlashCommandBuilder()
  .setName("setup")
  .setDescription("[Admin] Idempotently create channels + roles from config")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function handleSetup(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });
  try {
    await ensureGuildSetup(interaction.client);
    await interaction.editReply({ content: "Setup complete. Channels, roles, and channel map are ready." });
  } catch (err) {
    await interaction.editReply({ content: `Setup failed: ${(err as Error).message}` });
  }
}
```

- [ ] **Step 6.4:** Update `src/commands/index.ts` to add `status`, `linkchannel`, `setup` handlers

```ts
import { ChatInputCommandInteraction } from "discord.js";
import { handlePing } from "./ping";
import { handleRoleAdd, handleRoleRemove } from "./role";
import { handleStatus } from "./status";
import { handleLinkChannel } from "./linkchannel";
import { handleSetup } from "./setup";

const handlers: Record<string, (i: ChatInputCommandInteraction) => Promise<void>> = {
  ping: handlePing,
  role: handleRoleAdd,
  unrole: handleRoleRemove,
  status: handleStatus,
  linkchannel: handleLinkChannel,
  setup: handleSetup,
};

export async function handleInteraction(interaction: ChatInputCommandInteraction): Promise<void> {
  const handler = handlers[interaction.commandName];
  if (handler) await handler(interaction);
}
```

- [ ] **Step 6.5:** Update `src/commands/deploy.ts` to register all commands

```ts
import { REST, Routes } from "discord.js";
import { Client } from "discord.js";
import { pingCommand } from "./ping";
import { roleCommand, unroleCommand } from "./role";
import { statusCommand } from "./status";
import { linkchannelCommand } from "./linkchannel";
import { setupCommand } from "./setup";

const commands = [
  pingCommand, roleCommand, unroleCommand,
  statusCommand, linkchannelCommand, setupCommand,
].map((c) => c.toJSON());

export async function deployCommands(client: Client): Promise<void> {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);
  const guild = client.guilds.cache.first();
  if (!guild) throw new Error("Bot is not in any guild");

  await rest.put(Routes.applicationGuildCommands(client.user!.id, guild.id), {
    body: commands,
  });

  console.log(`Deployed ${commands.length} slash commands`);
}
```

- [ ] **Step 6.6:** Run `npx tsc --noEmit` — verify clean

- [ ] **Step 6.7:** Run `npm test` — verify all still pass

- [ ] **Step 6.8:** Commit

```bash
git add src/commands/
git commit -m "feat(commands): /status, /linkchannel, /setup"
```

---

### Task 7: Final entry point + full test + commit

**Files:**
- Update: `src/index.ts` (already written in Task 1)

- [ ] **Step 7.1:** Verify `src/index.ts` exists and imports are correct (written in Task 1)

- [ ] **Step 7.2:** Run full verification

```bash
npx tsc --noEmit
npm test
```

- [ ] **Step 7.3:** Commit all remaining changes

```bash
git add -A
git commit -m "chore(plan3): complete Discord poster + commands + provisioning"
```

---

## Phased Directory

```
docs/superpowers/plans/2026-07-25-03-poster-commands-deploy.md
```

## Self-Review Checklist

1. **Spec coverage:** Poster embed (Section 8), Poster channel routing (Section 8), 6 slash commands (Section 8), provisioning (Section 8), deployment (Section 9) — all covered.
2. **Placeholder scan:** All steps contain actual code. No TBD/TODO patterns.
3. **Type consistency:** `buildPostingEmbed()` signature same in Task 2 (defined) and Task 3 (consumed). `onNewPosting` signature updated in Task 3, reflected in scheduler. `handleInteraction` imported and dispatched correctly across Tasks 5-6.

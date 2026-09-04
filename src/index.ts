import "dotenv/config";
import { validateEnv } from "@/config/env";
import { Client, GatewayIntentBits, Events, Partials } from "discord.js";
import { SourcesManager } from "@/scheduler/index";
import { getAllAdapters } from "@/adapters/index";
import { prisma } from "@/db/client";
import { runBackfill } from "@/scheduler/backfill";
import { deployCommands } from "@/commands/deploy";
import { handleInteraction, handleAutocomplete } from "@/commands/index";
import { handleOnboardReaction } from "@/commands/onboard-reactions";
import { ensureGuildSetup } from "@/provisioner/index";
import { Poster } from "@/poster/index";
import { ensureLiveSince } from "@/lib/live-since";

const env = validateEnv();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

let manager: SourcesManager | null = null;
let poster: Poster | null = null;

async function shutdown(signal: string) {
  console.log(`Received ${signal}, shutting down...`);
  manager?.stop();
  poster?.stop();
  await prisma.$disconnect();
  client.destroy();
  process.exit(0);
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

client.once(Events.ClientReady, async () => {
  try {
    console.log(`Logged in as ${client.user?.tag}`);

    // Single-guild: cache.first() is the only server this process will configure or post to.
    await client.guilds.fetch();
    if (client.guilds.cache.size === 0) {
      throw new Error(
        "Bot is not in any guild. Invite it with the bot and applications.commands scopes, then restart."
      );
    }
    if (client.guilds.cache.size > 1) {
      const guild = client.guilds.cache.first()!;
      console.warn(
        `Bot is in ${client.guilds.cache.size} guilds; using ${guild.name} (${guild.id}) only`
      );
    }

    await ensureGuildSetup(client);

    await deployCommands(client);

    const guild = client.guilds.cache.first()!;
    const liveSince = await ensureLiveSince(guild.id);
    console.log(`Only posting jobs published on or after ${liveSince.toISOString().slice(0, 10)}`);

    poster = new Poster(client, prisma);

    if (env.BACKFILL) {
      console.log(`Running backfill (limit ${env.BACKFILL_LIMIT} per source)...`);
      await runBackfill(
        { enabled: true, limitPerSource: env.BACKFILL_LIMIT, liveSince },
        (posting, hash) => poster!.send(posting, hash)
      );
      console.log("Backfill complete");
    }

    manager = new SourcesManager(
      getAllAdapters(),
      (posting, hash) => poster!.send(posting, hash),
      (source, error) => console.error(`[${source}] ${error.message}`),
      liveSince
    );
    manager.start();
    console.log("SourcesManager started");
  } catch (err) {
    console.error("Startup failed:", err);
    process.exit(1);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    await handleInteraction(interaction);
  } else if (interaction.isAutocomplete()) {
    await handleAutocomplete(interaction);
  }
});

client.on(Events.MessageReactionAdd, (reaction, user) => {
  void handleOnboardReaction(reaction, user, true);
});

client.on(Events.MessageReactionRemove, (reaction, user) => {
  void handleOnboardReaction(reaction, user, false);
});

void Promise.resolve(client.login(env.DISCORD_TOKEN)).catch((err) => {
  console.error("Login failed:", err);
  process.exit(1);
});

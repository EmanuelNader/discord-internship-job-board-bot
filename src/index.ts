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
  console.log(`Logged in as ${client.user?.tag}`);

  await ensureGuildSetup(client);

  await deployCommands(client);

  poster = new Poster(client, prisma);

  if (env.BACKFILL) {
    console.log(`Running backfill (limit ${env.BACKFILL_LIMIT} per source)...`);
    await runBackfill(
      { enabled: true, limitPerSource: env.BACKFILL_LIMIT },
      (posting, hash) => poster!.send(posting, hash)
    );
    console.log("Backfill complete");
  }

  manager = new SourcesManager(
    getAllAdapters(),
    (posting, hash) => poster!.send(posting, hash),
    (source, error) => console.error(`[${source}] ${error.message}`)
  );
  manager.start();
  console.log("SourcesManager started");
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

client.login(env.DISCORD_TOKEN);

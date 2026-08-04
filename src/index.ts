import "dotenv/config";
import { validateEnv } from "@/config/env";
import { Client, GatewayIntentBits, Events } from "discord.js";
import { SourcesManager } from "@/scheduler/index";
import { getAllAdapters } from "@/adapters/index";
import { prisma } from "@/db/client";
import { runBackfill } from "@/scheduler/backfill";
import { deployCommands } from "@/commands/deploy";
import { handleInteraction, handleAutocomplete } from "@/commands/index";
import { ensureGuildSetup } from "@/provisioner/index";
import { Poster } from "@/poster/index";

const env = validateEnv();

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
    (posting, hash) => poster.send(posting, hash),
    (source, error) => console.error(error.message)
  );

  if (env.BACKFILL) {
    console.log("Running backfill...");
    await runBackfill({ enabled: true, limitPerSource: env.BACKFILL_LIMIT });
  }

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

client.login(env.DISCORD_TOKEN);

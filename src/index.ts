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
    (posting, hash) => poster.send(posting, hash),
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

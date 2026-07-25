import "dotenv/config";
import { Client, GatewayIntentBits, Events, REST, Routes } from "discord.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const commands = [
  {
    name: "ping",
    description: "Replies with Pong!",
  },
  {
    name: "jobsearch",
    description: "Search for internships",
    options: [
      { name: "query", type: 3, description: "Search query (e.g., 'software engineer intern')", required: true },
      { name: "location", type: 3, description: "Location filter (optional)", required: false },
    ],
  },
];

client.once(Events.ClientReady, async (c) => {
  console.log(`Logged in as ${c.user.tag}`);
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);
  try {
    await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!), { body: commands });
    console.log("Slash commands registered globally.");
  } catch (err) {
    console.error("Failed to register commands:", err);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName } = interaction;

  if (commandName === "ping") {
    await interaction.reply("Pong!");
  } else if (commandName === "jobsearch") {
    await interaction.deferReply();
    const query = interaction.options.getString("query", true);
    const location = interaction.options.getString("location") ?? "";
    await interaction.editReply(`🔍 Searching for "${query}"${location ? ` in ${location}` : ""}... (not yet implemented)`);
  }
});

client.login(process.env.DISCORD_TOKEN);

process.on("beforeExit", async () => {
  await prisma.$disconnect();
});
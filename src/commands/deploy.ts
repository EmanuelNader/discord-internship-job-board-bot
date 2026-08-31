import { REST, Routes } from "discord.js";
import { Client } from "discord.js";
import { pingCommand } from "./ping";
import { roleCommand, unroleCommand } from "./role";
import { statusCommand } from "./status";
import { linkchannelCommand } from "./linkchannel";
import { setupCommand } from "./setup";
import { onboardCommand } from "./onboard";

const commands = [
  pingCommand, roleCommand, unroleCommand,
  statusCommand, linkchannelCommand, setupCommand, onboardCommand,
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

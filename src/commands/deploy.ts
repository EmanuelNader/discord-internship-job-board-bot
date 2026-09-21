import { REST, Routes } from "discord.js";
import { Client, Guild } from "discord.js";
import { pingCommand } from "./ping";
import { roleCommand, unroleCommand } from "./role";
import { statusCommand } from "./status";
import { linkchannelCommand } from "./linkchannel";
import { setupCommand } from "./setup";
import { onboardCommand } from "./onboard";
import { settingsCommand } from "./settings";

const commands = [
  pingCommand, roleCommand, unroleCommand,
  statusCommand, linkchannelCommand, setupCommand, onboardCommand, settingsCommand,
].map((c) => c.toJSON());

export async function deployCommands(client: Client, guild?: Guild): Promise<void> {
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);
  if (!client.user) {
    throw new Error("Cannot deploy commands before the Discord client is logged in.");
  }

  const guilds = guild ? [guild] : [...client.guilds.cache.values()];
  if (guilds.length === 0) {
    console.warn("No guilds yet; slash commands will deploy when the bot joins a server.");
    return;
  }

  for (const target of guilds) {
    await rest.put(Routes.applicationGuildCommands(client.user.id, target.id), {
      body: commands,
    });
    console.log(`Deployed ${commands.length} slash commands to ${target.name} (${target.id})`);
  }
}

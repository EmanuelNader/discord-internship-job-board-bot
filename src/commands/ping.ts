import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

export const pingCommand = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Health check — replies with latency");

export async function handlePing(interaction: ChatInputCommandInteraction): Promise<void> {
  const latency = Date.now() - interaction.createdTimestamp;
  await interaction.reply(`Pong! Latency: ${latency}ms`);
}

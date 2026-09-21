import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { roleFamilies } from "@/config/roles.config";

export const settingsCommand = new SlashCommandBuilder()
  .setName("settings")
  .setDescription("[Admin] Show which job families are on and which channel they use")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export function buildSettingsEmbed(): EmbedBuilder {
  const lines = roleFamilies.map((family) => {
    const state = family.enabled ? "on" : "off";
    return `${family.emoji} **${family.roleName}** — \`${state}\` — \`#${family.channelName}\``;
  });

  return new EmbedBuilder()
    .setTitle("Job family settings")
    .setColor(0x5865f2)
    .setDescription(lines.join("\n"))
    .setFooter({
      text: "Flip enabled in src/config/roles.config.ts, rebuild, then /setup. Join does not create channels.",
    });
}

export async function handleSettings(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.reply({ embeds: [buildSettingsEmbed()], ephemeral: true });
}

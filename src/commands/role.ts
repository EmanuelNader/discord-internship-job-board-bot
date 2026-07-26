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

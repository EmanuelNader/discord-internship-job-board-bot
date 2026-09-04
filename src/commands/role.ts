import { AutocompleteInteraction, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { roleFamilies } from "@/config/roles.config";

const familyChoices = roleFamilies.map((f) => ({
  name: f.roleName,
  value: f.family,
}));

export const roleCommand = new SlashCommandBuilder()
  .setName("role")
  .setDescription("Self-assign a ping role")
  .addStringOption((opt) =>
    opt
      .setName("role")
      .setDescription("Role to self-assign")
      .setRequired(true)
      .setAutocomplete(true)
  );

export const unroleCommand = new SlashCommandBuilder()
  .setName("unrole")
  .setDescription("Remove a self-assigned ping role")
  .addStringOption((opt) =>
    opt
      .setName("role")
      .setDescription("Role to remove")
      .setRequired(true)
      .setAutocomplete(true)
  );

export async function handleRoleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
  const focused = interaction.options.getFocused(true);
  const query = focused.value.toLowerCase();
  const choices = familyChoices
    .filter((c) => c.name.toLowerCase().includes(query) || c.value.toLowerCase().includes(query))
    .slice(0, 25);
  await interaction.respond(choices);
}

export async function handleRoleAdd(interaction: ChatInputCommandInteraction): Promise<void> {
  const familyId = interaction.options.getString("role", true);
  const family = roleFamilies.find((f) => f.family === familyId);
  if (!family) {
    await interaction.reply({ content: "Unknown role.", ephemeral: true });
    return;
  }

  const member = await interaction.guild?.members.fetch(interaction.user.id);
  if (!member) {
    await interaction.reply({ content: "Could not find your member record.", ephemeral: true });
    return;
  }

  const role = interaction.guild?.roles.cache.find((r) => r.name === family.roleName);
  if (!role) {
    await interaction.reply({ content: "Role not found on server. Run /setup first.", ephemeral: true });
    return;
  }

  try {
    await member.roles.add(role);
    await interaction.reply({ content: `Assigned ${family.roleName}.`, ephemeral: true });
  } catch {
    await interaction.reply({ content: "Failed to assign role. Check permissions.", ephemeral: true });
  }
}

export async function handleRoleRemove(interaction: ChatInputCommandInteraction): Promise<void> {
  const familyId = interaction.options.getString("role", true);
  const family = roleFamilies.find((f) => f.family === familyId);
  if (!family) {
    await interaction.reply({ content: "Unknown role.", ephemeral: true });
    return;
  }

  const member = await interaction.guild?.members.fetch(interaction.user.id);
  if (!member) {
    await interaction.reply({ content: "Could not find your member record.", ephemeral: true });
    return;
  }

  const role = interaction.guild?.roles.cache.find((r) => r.name === family.roleName);
  if (!role) {
    await interaction.reply({ content: "Role not found on server.", ephemeral: true });
    return;
  }

  try {
    await member.roles.remove(role);
    await interaction.reply({ content: `Removed ${family.roleName}.`, ephemeral: true });
  } catch {
    await interaction.reply({ content: "Failed to remove role. Check permissions.", ephemeral: true });
  }
}

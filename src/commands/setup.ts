import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { ensureGuildSetup } from "@/provisioner/index";

export const setupCommand = new SlashCommandBuilder()
  .setName("setup")
  .setDescription("[Admin] Idempotently create channels + roles from config")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function handleSetup(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });
  try {
    await ensureGuildSetup(interaction.client);
    await interaction.editReply({ content: "Setup complete. Channels, roles, and channel map are ready." });
  } catch (err) {
    await interaction.editReply({ content: `Setup failed: ${(err as Error).message}` });
  }
}

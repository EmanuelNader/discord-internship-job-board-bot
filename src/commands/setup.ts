import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { ensureGuildSetup } from "@/provisioner/index";
import { OVERVIEW_CHANNEL_NAME } from "@/config/roles.config";

export const setupCommand = new SlashCommandBuilder()
  .setName("setup")
  .setDescription("[Admin] Idempotently create channels + roles from config")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function handleSetup(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });
  try {
    if (!interaction.guild) {
      await interaction.editReply({ content: "Run /setup in a server." });
      return;
    }
    await ensureGuildSetup(interaction.guild);
    await interaction.editReply({
      content: `Setup complete. \`#${OVERVIEW_CHANNEL_NAME}\`, job channels, roles, and channel map are ready. Run /onboard to post the reaction panel in \`#${OVERVIEW_CHANNEL_NAME}\`.`,
    });
  } catch (err) {
    await interaction.editReply({ content: `Setup failed: ${(err as Error).message}` });
  }
}

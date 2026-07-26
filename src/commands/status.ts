import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { prisma } from "@/db/client";

export const statusCommand = new SlashCommandBuilder()
  .setName("status")
  .setDescription("Show per-source health counters");

export async function handleStatus(interaction: ChatInputCommandInteraction): Promise<void> {
  const sources = await prisma.source.findMany();

  const embed = new EmbedBuilder()
    .setTitle("Source Health")
    .setColor(0x3498db);

  for (const s of sources) {
    embed.addFields({
      name: s.name,
      value: [
        `Last run: ${s.lastRunAt?.toISOString() ?? "never"}`,
        `Ingested: ${s.ingestedCount}`,
        `Dropped (non-intern): ${s.droppedNonIntern}`,
        `Dropped (unclassified): ${s.droppedUnclassified}`,
        `Error: ${s.lastError ?? "none"}`,
      ].join("\n"),
    });
  }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

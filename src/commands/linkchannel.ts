import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { prisma } from "@/db/client";
import { roleFamilies } from "@/config/roles.config";

const familyChoices = roleFamilies.map((f) => ({
  name: f.family,
  value: f.family,
}));

export const linkchannelCommand = new SlashCommandBuilder()
  .setName("linkchannel")
  .setDescription("[Admin] Bind a channel to a role family")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption((opt) =>
    opt.setName("family").setDescription("Role family").setRequired(true).addChoices(...familyChoices)
  )
  .addChannelOption((opt) =>
    opt.setName("channel").setDescription("Text channel").setRequired(true)
  );

export async function handleLinkChannel(interaction: ChatInputCommandInteraction): Promise<void> {
  const family = interaction.options.getString("family", true);
  const channel = interaction.options.getChannel("channel", true);

  await prisma.channelMap.upsert({
    where: { kind_roleFamily: { kind: "job", roleFamily: family } },
    create: { kind: "job", roleFamily: family, channelId: channel.id },
    update: { channelId: channel.id },
  });

  await interaction.reply({ content: `Linked #${channel.name} to \`${family}\` postings.`, ephemeral: true });
}

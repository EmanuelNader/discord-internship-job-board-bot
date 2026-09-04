import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";
import { ensureGuildSetup } from "@/provisioner/index";
import { roleFamilies } from "@/config/roles.config";
import { adapterConfigs } from "@/config/adapters.config";
import { prisma } from "@/db/client";

export const onboardCommand = new SlashCommandBuilder()
  .setName("onboard")
  .setDescription("[Admin] Create channels and post the welcome + reaction-role panel")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

function sourceBlurb(): string {
  const enabled = adapterConfigs.filter((c) => c.enabled).map((c) => c.name);
  const labels: Record<string, string> = {
    github: "GitHub internship READMEs (SimplifyJobs, vanshb03, speedyapply — including off-season)",
    greenhouse: "Greenhouse career boards (SpaceX, Stripe, Rocket Lab, and others)",
    ashby: "Ashby boards (Notion, OpenAI, Cursor, and others)",
    lever: "Lever boards (Palantir, Spotify, Zoox, Belvedere)",
    workday: "Workday (NVIDIA, Blue Origin, Caterpillar, Qualcomm, RTX, and others)",
  };
  return enabled
    .filter((name) => labels[name])
    .map((name) => `• ${labels[name]}`)
    .join("\n");
}

export function buildOnboardEmbed(): EmbedBuilder {
  const reactions = roleFamilies
    .map((f) => `${f.emoji}  \`#${f.channelName}\``)
    .join("\n");

  return new EmbedBuilder()
    .setTitle("Engineering intern job board")
    .setColor(0x5865f2)
    .setDescription(
      [
        "This bot watches public internship lists and company career pages, keeps **US intern / co-op / fellowship** roles, and posts them into the matching channel below.",
        "",
        "React with an emoji to get pinged when a new listing lands in that family. Remove the reaction to stop pings. You can also use `/role` / `/unrole`.",
      ].join("\n")
    )
    .addFields(
      { name: "What it scrapes", value: sourceBlurb() },
      { name: "Choose your pings", value: reactions }
    );
}

export async function handleOnboard(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const channel = interaction.channel;
  if (!channel || !channel.isTextBased() || channel.isDMBased()) {
    await interaction.editReply({ content: "Run /onboard in a server text channel." });
    return;
  }

  try {
    await ensureGuildSetup(interaction.client);

    const embed = buildOnboardEmbed();
    const textChannel = channel as TextChannel;
    const message = await textChannel.send({ embeds: [embed] });
    for (const family of roleFamilies) {
      await message.react(family.emoji);
    }

    await prisma.onboardPanel.upsert({
      where: { guildId: interaction.guildId! },
      create: {
        guildId: interaction.guildId!,
        channelId: textChannel.id,
        messageId: message.id,
      },
      update: {
        channelId: textChannel.id,
        messageId: message.id,
      },
    });

    await interaction.editReply({
      content: `Onboarding posted in <#${textChannel.id}>. Job channels and ping roles are ready.`,
    });
  } catch (err) {
    await interaction.editReply({ content: `Onboard failed: ${(err as Error).message}` });
  }
}

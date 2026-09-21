import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { ensureGuildSetup } from "@/provisioner/index";
import { getEnabledRoleFamilies, OVERVIEW_CHANNEL_NAME } from "@/config/roles.config";
import { adapterConfigs } from "@/config/adapters.config";
import { prisma } from "@/db/client";

export const onboardCommand = new SlashCommandBuilder()
  .setName("onboard")
  .setDescription("[Admin] Create channels and post the reaction panel in #job-board")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

function sourceBlurb(): string {
  const enabled = adapterConfigs.filter((c) => c.enabled).map((c) => c.name);
  const labels: Record<string, string> = {
    github: "GitHub internship READMEs (SimplifyJobs, vanshb03, speedyapply — including off-season)",
    greenhouse: "Greenhouse career boards (SpaceX, Stripe, Rocket Lab, and others)",
    ashby: "Ashby boards (Notion, OpenAI, Cursor, and others)",
    lever: "Lever boards (Palantir, Spotify, Zoox, Belvedere)",
    workday: "Workday (Boeing, GE Aerospace, Baker Hughes, Dow, Caterpillar, RTX, and others)",
  };
  return enabled
    .filter((name) => labels[name])
    .map((name) => `• ${labels[name]}`)
    .join("\n");
}

export function buildOnboardEmbed(): EmbedBuilder {
  const reactions = getEnabledRoleFamilies()
    .map((f) => `${f.emoji}  ${f.overviewLabel ?? f.roleName}  \`#${f.channelName}\``)
    .join("\n");

  return new EmbedBuilder()
    .setTitle("Engineering intern job board")
    .setColor(0x5865f2)
    .setDescription(
      [
        "This bot watches public internship lists and company career pages, keeps **US intern / co-op / fellowship** roles, and posts them into the matching channel below.",
        "",
        `This is \`#${OVERVIEW_CHANNEL_NAME}\` — react here for pings. Listings never post in this channel.`,
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

  if (!interaction.guild) {
    await interaction.editReply({ content: "Run /onboard in a server." });
    return;
  }

  try {
    const overview = await ensureGuildSetup(interaction.guild);
    await removePreviousPanel(interaction.guildId!, interaction.guild);

    const embed = buildOnboardEmbed();
    const message = await overview.send({ embeds: [embed] });
    for (const family of getEnabledRoleFamilies()) {
      await message.react(family.emoji);
    }

    await prisma.onboardPanel.upsert({
      where: { guildId: interaction.guildId! },
      create: {
        guildId: interaction.guildId!,
        channelId: overview.id,
        messageId: message.id,
      },
      update: {
        channelId: overview.id,
        messageId: message.id,
      },
    });

    await interaction.editReply({
      content: `Overview posted in <#${overview.id}>. React there for pings — listings go in the family channels, not here.`,
    });
  } catch (err) {
    await interaction.editReply({ content: `Onboard failed: ${(err as Error).message}` });
  }
}

async function removePreviousPanel(guildId: string, guild: NonNullable<ChatInputCommandInteraction["guild"]>): Promise<void> {
  const previous = await prisma.onboardPanel.findUnique({ where: { guildId } });
  if (!previous) return;
  try {
    const channel = await guild.channels.fetch(previous.channelId);
    if (!channel || !channel.isTextBased()) return;
    const oldMessage = await channel.messages.fetch(previous.messageId);
    await oldMessage.delete();
  } catch {
    // Old panel already gone (deleted channel, missing message, etc.)
  }
}

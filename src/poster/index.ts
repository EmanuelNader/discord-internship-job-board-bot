import { Client, TextChannel } from "discord.js";
import { prisma } from "@/db/client";
import { buildPostingEmbed } from "./embed";

interface PostingToSend {
  title: string;
  company: string;
  location: string | null;
  url: string;
  level: string;
  sourceName: string;
  roleFamily: string[];
  roleTitles: string[];
}

export class Poster {
  constructor(
    private readonly client: Client,
    private readonly prismaClient?: typeof prisma
  ) {}

  async send(
    posting: PostingToSend,
    dedupHash: string
  ): Promise<void> {
    const prismaImpl = this.prismaClient ?? prisma;

    const channels = await prismaImpl.channelMap.findMany({
      where: { kind: "job", roleFamily: { in: posting.roleFamily } },
    });

    if (channels.length === 0) return;

    const embed = buildPostingEmbed(posting);
    const sentChannelIds: string[] = [];

    for (const ch of channels) {
      try {
        const channel = await this.client.channels.fetch(ch.channelId);
        if (!channel?.isTextBased()) continue;
        await (channel as TextChannel).send({ embeds: [embed] });
        sentChannelIds.push(ch.channelId);
      } catch (err) {
        console.error(`Failed to send to channel ${ch.channelId}:`, err);
      }
    }

    if (sentChannelIds.length > 0) {
      await prismaImpl.posting.update({
        where: { dedupHash },
        data: {
          postedAt: new Date(),
          channelIds: JSON.stringify(sentChannelIds),
        },
      });
    }
  }
}

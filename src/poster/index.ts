import { Client, TextChannel } from "discord.js";
import { prisma } from "@/db/client";
import { buildPostingEmbed } from "./embed";
import { roleFamilies } from "@/config/roles.config";

interface PostingToSend {
  title: string;
  company: string;
  location: string | null;
  url: string;
  level: string;
  sourceName: string;
  roleFamily: string[];
  roleTitles: string[];
  postedAt?: Date;
}

export class Poster {
  private channelCache = new Map<string, TextChannel>();

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

    const guild = this.client.guilds.cache.first();
    const pingRoleIds: string[] = [];
    if (guild && posting.roleTitles.length > 0) {
      for (const family of roleFamilies) {
        for (const title of family.titles) {
          if (posting.roleTitles.includes(title.title)) {
            const role = guild.roles.cache.find((r) => r.name === title.roleName);
            if (role) pingRoleIds.push(role.id);
          }
        }
      }
    }
    const roleMentions = pingRoleIds.length > 0 ? pingRoleIds.map((id) => `<@&${id}>`).join(" ") : undefined;

    const embed = buildPostingEmbed(posting);
    const sentChannelIds: string[] = [];

    for (const ch of channels) {
      try {
        let channel = this.channelCache.get(ch.channelId);
        if (!channel) {
          const fetched = await this.client.channels.fetch(ch.channelId);
          if (!fetched?.isTextBased()) continue;
          channel = fetched as TextChannel;
          this.channelCache.set(ch.channelId, channel);
        }
        await channel.send({
          content: roleMentions,
          embeds: [embed],
          allowedMentions: roleMentions ? { roles: pingRoleIds } : undefined,
        });
        sentChannelIds.push(ch.channelId);
      } catch (err) {
        console.error(`Failed to send to channel ${ch.channelId}:`, err);
      }
    }

    if (sentChannelIds.length > 0) {
      try {
        await prismaImpl.posting.update({
          where: { dedupHash },
          data: {
            postedAt: new Date(),
            channelIds: JSON.stringify(sentChannelIds),
          },
        });
      } catch (err) {
        console.error(`Failed to mark posting ${dedupHash} as posted:`, err);
      }
    }
  }
}

import { Guild } from "discord.js";
import { getEnabledRoleFamilies } from "@/config/roles.config";
import { prisma } from "@/db/client";

export async function ensureGuildSetup(guild: Guild): Promise<void> {
  const existingChannels = await guild.channels.fetch();
  const existingRoles = await guild.roles.fetch();

  for (const family of getEnabledRoleFamilies()) {
    const channelName = family.channelName;
    let channel = existingChannels.find((c) => c?.name === channelName);

    if (!channel) {
      channel = await guild.channels.create({
        name: channelName,
        type: 0, // GuildText
        topic: `${family.roleName} internship postings`,
      });
    }

    await prisma.channelMap.upsert({
      where: { kind_roleFamily: { kind: "job", roleFamily: family.family } },
      create: {
        kind: "job",
        roleFamily: family.family,
        channelId: channel.id,
      },
      update: { channelId: channel.id },
    });

    let pingRole = existingRoles.find((r) => r?.name === family.roleName);
    if (!pingRole) {
      pingRole = await guild.roles.create({
        name: family.roleName,
        mentionable: true,
        reason: `Auto-provisioned ping role for ${family.family}`,
      });
    }

    for (const title of family.titles) {
      const leftover = existingRoles.find((r) => r?.name === title.roleName);
      if (leftover && leftover.name !== family.roleName && "delete" in leftover) {
        try {
          await leftover.delete("Collapsed title ping roles into family roles");
        } catch (err) {
          console.error(`Failed to delete leftover role ${title.roleName}:`, err);
        }
      }
    }
  }
}

import { MessageReaction, PartialMessageReaction, PartialUser, User } from "discord.js";
import { roleFamilies } from "@/config/roles.config";
import { prisma } from "@/db/client";

export function familyForEmoji(emojiName: string | null): (typeof roleFamilies)[number] | undefined {
  if (!emojiName) return undefined;
  return roleFamilies.find((f) => f.emoji === emojiName);
}

export async function handleOnboardReaction(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
  add: boolean
): Promise<void> {
  if (user.bot) return;

  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch {
      return;
    }
  }

  const panel = await prisma.onboardPanel.findUnique({ where: { messageId: reaction.message.id } });
  if (!panel) return;

  const family = familyForEmoji(reaction.emoji.name);
  if (!family) return;

  const guild = reaction.message.guild;
  if (!guild) return;

  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member) return;

  try {
    await guild.roles.fetch();
  } catch {
    // use cache if fetch fails
  }

  const role = guild.roles.cache.find((r) => r.name === family.roleName);
  if (!role) return;
  try {
    if (add) await member.roles.add(role);
    else await member.roles.remove(role);
  } catch (err) {
    console.error(`Failed to ${add ? "add" : "remove"} ${family.roleName} for ${user.id}:`, err);
  }
}

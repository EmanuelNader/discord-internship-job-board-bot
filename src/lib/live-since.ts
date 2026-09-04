import { prisma } from "@/db/client";
import { startOfUtcDay } from "@/lib/freshness";

export async function ensureLiveSince(guildId: string, now = new Date()): Promise<Date> {
  const existing = await prisma.guildState.findUnique({ where: { guildId } });
  if (existing) return existing.liveSince;

  const liveSince = startOfUtcDay(now);
  await prisma.guildState.create({
    data: { guildId, liveSince },
  });
  return liveSince;
}

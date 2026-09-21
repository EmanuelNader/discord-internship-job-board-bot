import type { Client } from "discord.js";
import { prisma } from "@/db/client";
import { Poster } from "@/poster/index";
import { ensureLiveSince } from "@/lib/live-since";

const DEFAULT_SEED_LIMIT = 200;

/**
 * Send recent DB jobs into the current channel map.
 * Skips a row if it was already delivered to one of those channels, so a later
 * /onboard (new server) still seeds, but a restart does not dump duplicates.
 */
export async function seedRecentPostings(
  send: Poster["send"],
  liveSince: Date,
  limit = DEFAULT_SEED_LIMIT
): Promise<{ sent: number; skipped: number }> {
  const mapped = await prisma.channelMap.findMany({ where: { kind: "job" } });
  const mappedIds = new Set(mapped.map((row) => row.channelId));
  if (mappedIds.size === 0) return { sent: 0, skipped: 0 };

  const rows = await prisma.posting.findMany({
    where: {
      kind: "job",
      OR: [
        { publishedAt: { gte: liveSince } },
        { AND: [{ publishedAt: null }, { firstSeenAt: { gte: liveSince } }] },
      ],
    },
    orderBy: [{ publishedAt: "desc" }, { firstSeenAt: "desc" }],
    take: limit,
  });

  let sent = 0;
  let skipped = 0;

  for (const row of rows) {
    let already: string[] = [];
    try {
      already = row.channelIds ? (JSON.parse(row.channelIds) as string[]) : [];
    } catch {
      already = [];
    }
    if (already.some((id) => mappedIds.has(id))) {
      skipped++;
      continue;
    }

    let roleFamily: string[] = [];
    let roleTitles: string[] = [];
    try {
      roleFamily = JSON.parse(row.roleFamily) as string[];
      roleTitles = JSON.parse(row.roleTitles) as string[];
    } catch {
      skipped++;
      continue;
    }

    await send(
      {
        title: row.title,
        company: row.company,
        location: row.location,
        url: row.url,
        level: row.level,
        sourceName: row.sourceName,
        roleFamily,
        roleTitles,
        postedAt: row.publishedAt ?? undefined,
      },
      row.dedupHash
    );
    sent++;
  }

  return { sent, skipped };
}

export async function seedRecentPostingsForGuild(client: Client, guildId: string): Promise<void> {
  const liveSince = await ensureLiveSince(guildId, new Date());
  const poster = new Poster(client, prisma);
  try {
    console.log(
      `Seeding jobs published on or after ${liveSince.toISOString().slice(0, 10)} into mapped channels...`
    );
    const result = await seedRecentPostings(poster.send.bind(poster), liveSince);
    console.log(`Seeded ${result.sent} jobs (${result.skipped} already in mapped channels)`);
  } finally {
    poster.stop();
  }
}

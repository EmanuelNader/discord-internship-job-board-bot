import { prisma } from "@/db/client";
import { getAllAdapters } from "@/adapters";
import { detectLevel, detectRoleFamily, detectRoleTitles, dedupHash } from "@/lib/normalize";

export interface BackfillOptions {
  limitPerSource: number;
  enabled: boolean;
}

export async function runBackfill(options: BackfillOptions): Promise<void> {
  if (!options.enabled) return;

  const adapters = getAllAdapters();

  for (const adapter of adapters) {
    try {
      const rawPostings = await adapter.fetchNewPostings();
      const limited = rawPostings.slice(0, options.limitPerSource);

      for (const raw of limited) {
        const level = detectLevel(raw.title, raw);
        if (!level) continue;

        const roleFamilies = detectRoleFamily(raw.title, raw);
        if (roleFamilies.length === 0) continue;

        const roleTitles = detectRoleTitles(raw.title, roleFamilies, raw);
        const hash = dedupHash(adapter.name, raw.externalId ?? "", raw.title, raw.company);

        await prisma.posting.upsert({
          where: { dedupHash: hash },
          create: {
            dedupHash: hash,
            externalId: raw.externalId ?? "",
            sourceName: adapter.name,
            kind: "job",
            level,
            title: raw.title.trim().replace(/\s+/g, " "),
            company: raw.company,
            location: raw.location,
            roleFamily: JSON.stringify(roleFamilies),
            roleTitles: JSON.stringify(roleTitles),
            url: raw.url,
            raw: raw.raw ? JSON.stringify(raw.raw) : null,
            postedAt: new Date(),
          },
          update: {},
        });
      }
    } catch (err) {
      console.error(`Backfill failed for ${adapter.name}:`, err);
    }
  }
}

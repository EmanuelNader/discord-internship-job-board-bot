import { prisma } from "@/db/client";
import { getAllAdapters } from "@/adapters";
import { detectLevel, detectRoleFamily, detectRoleTitles, dedupHash, contentHash, isUsLocation } from "@/lib/normalize";

export interface BackfillOptions {
  limitPerSource: number;
  enabled: boolean;
}

export type BackfillOnNewPosting = (
  posting: {
    title: string;
    company: string;
    location: string | null;
    url: string;
    sourceName: string;
    roleFamily: string[];
    roleTitles: string[];
    level: string;
    postedAt?: Date;
  },
  dedupHash: string
) => Promise<void>;

export async function runBackfill(
  options: BackfillOptions,
  onNewPosting: BackfillOnNewPosting
): Promise<void> {
  if (!options.enabled) return;

  const adapters = getAllAdapters();

  for (const adapter of adapters) {
    try {
      const rawPostings = await adapter.fetchNewPostings();
      const limited = rawPostings.slice(0, options.limitPerSource);

      for (const raw of limited) {
        const level = detectLevel(raw.title, raw);
        if (!level) continue;

        if (!isUsLocation(raw.location)) continue;

        const roleFamilies = detectRoleFamily(raw.title, raw);
        if (roleFamilies.length === 0) continue;

        const roleTitles = detectRoleTitles(raw.title, roleFamilies, raw);
        const hash = dedupHash(adapter.name, raw.externalId ?? "", raw.title, raw.company);
        const cHash = contentHash(raw.title, raw.company);

        // Check if this job content already exists from another source
        const existingByContent = await prisma.posting.findUnique({ where: { contentHash: cHash } });
        if (existingByContent) continue;

        const publishedAt = raw.publishedAt ? new Date(raw.publishedAt) : null;

        await prisma.posting.upsert({
          where: { dedupHash: hash },
          create: {
            dedupHash: hash,
            contentHash: cHash,
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
            publishedAt,
            raw: raw.raw ? JSON.stringify(raw.raw) : null,
            postedAt: null,
          },
          update: {},
        });

        const existing = await prisma.posting.findUnique({ where: { dedupHash: hash } });
        if (existing && !existing.postedAt) {
          await onNewPosting({
            title: raw.title,
            company: raw.company,
            location: raw.location ?? null,
            url: raw.url,
            sourceName: adapter.name,
            roleFamily: roleFamilies,
            roleTitles,
            level,
            postedAt: existing.publishedAt ?? existing.firstSeenAt,
          }, hash);
        }
      }
    } catch (err) {
      console.error(`Backfill failed for ${adapter.name}:`, err);
    }
  }
}

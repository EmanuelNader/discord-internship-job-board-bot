import type { SourceAdapter, RawPosting } from "@/lib/types";
import { prisma } from "@/db/client";
import { detectLevel, detectRoleFamily, detectRoleTitles, dedupHash } from "@/lib/normalize";

export class SourcesManager {
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private running = false;

  constructor(
    private readonly adapters: SourceAdapter[],
    private readonly onNewPosting: (posting: RawPosting & { roleFamilies: string[]; roleTitles: string[]; level: string }) => Promise<void>,
    private readonly onError: (source: string, error: Error) => void
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;

    for (const adapter of this.adapters) {
      const run = () => this.runAdapter(adapter);
      run();
      const interval = setInterval(run, adapter.pollIntervalSec * 1000);
      this.intervals.set(adapter.name, interval);
    }
  }

  stop(): void {
    for (const interval of this.intervals.values()) clearInterval(interval);
    this.intervals.clear();
    this.running = false;
  }

  async runOnce(sourceName: string): Promise<void> {
    const adapter = this.adapters.find((a) => a.name === sourceName);
    if (!adapter) throw new Error(`Adapter not found: ${sourceName}`);
    await this.runAdapter(adapter);
  }

  private async runAdapter(adapter: SourceAdapter): Promise<void> {
    let ingested = 0;
    let droppedNonIntern = 0;
    let droppedUnclassified = 0;
    let lastError: string | null = null;

    try {
      const rawPostings = await adapter.fetchNewPostings();

      for (const raw of rawPostings) {
        const level = detectLevel(raw.title, raw);
        if (!level) {
          droppedNonIntern++;
          continue;
        }

        const roleFamilies = detectRoleFamily(raw.title, raw);
        if (roleFamilies.length === 0) {
          droppedUnclassified++;
          continue;
        }

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
          },
          update: {},
        });

        const existing = await prisma.posting.findUnique({ where: { dedupHash: hash } });
        if (existing && !existing.postedAt) {
          await this.onNewPosting({
            ...raw,
            roleFamilies,
            roleTitles,
            level,
          });
          ingested++;
        }
      }
    } catch (err) {
      lastError = (err as Error).message;
      this.onError(adapter.name, err as Error);
    } finally {
      await prisma.source.upsert({
        where: { name: adapter.name },
        create: {
          name: adapter.name,
          lastRunAt: new Date(),
          ingestedCount: ingested,
          droppedNonIntern,
          droppedUnclassified,
          lastError,
          pollIntervalSec: adapter.pollIntervalSec,
        },
        update: {
          lastRunAt: new Date(),
          ingestedCount: { increment: ingested },
          droppedNonIntern: { increment: droppedNonIntern },
          droppedUnclassified: { increment: droppedUnclassified },
          lastError,
        },
      });
    }
  }
}

import type { SourceAdapter, RawPosting } from "@/lib/types";
import { adapterConfigs } from "@/config/adapters.config";
import { fetchJson, collectFromTargets } from "./base";

interface AshbyJob {
  id: string;
  title: string;
  location?: string;
  jobUrl?: string;
  applyUrl?: string;
  publishedAt?: string;
  isListed?: boolean;
}

interface AshbyResponse {
  jobs: AshbyJob[];
}

function titleCaseSlug(slug: string): string {
  return slug
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export function createAshbyAdapter(): SourceAdapter {
  const config = adapterConfigs.find((c) => c.name === "ashby");
  if (!config) throw new Error("Ashby config not found");

  return {
    name: "ashby",
    pollIntervalSec: config.pollIntervalSec,
    async fetchNewPostings(): Promise<RawPosting[]> {
      return collectFromTargets(
        "ashby",
        config.companies,
        async (company) => {
          const data = await fetchJson<AshbyResponse>(
            `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(company)}`
          );
          return (data.jobs ?? [])
            .filter((job) => job.isListed !== false && job.title && (job.jobUrl || job.applyUrl))
            .map((job) => ({
              title: job.title,
              company: titleCaseSlug(company),
              location: job.location ?? null,
              url: job.jobUrl ?? job.applyUrl!,
              externalId: job.id,
              publishedAt: job.publishedAt,
              raw: job as unknown as Record<string, unknown>,
            }));
        },
        (company) => company
      );
    },
  };
}

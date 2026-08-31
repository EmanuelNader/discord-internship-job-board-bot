import type { SourceAdapter, RawPosting } from "@/lib/types";
import { adapterConfigs } from "@/config/adapters.config";
import { fetchJson, collectFromTargets } from "./base";

interface LeverPosting {
  id: string;
  text: string;
  categories?: { location?: string; team?: string };
  applyUrl?: string;
  hostedUrl: string;
  createdAt?: number;
}

function titleCaseSlug(slug: string): string {
  return slug
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export function createLeverAdapter(): SourceAdapter {
  const config = adapterConfigs.find((c) => c.name === "lever");
  if (!config) throw new Error("Lever config not found");

  return {
    name: "lever",
    pollIntervalSec: config.pollIntervalSec,
    async fetchNewPostings(): Promise<RawPosting[]> {
      return collectFromTargets(
        "lever",
        config.companies,
        async (company) => {
          const data = await fetchJson<LeverPosting[] | { postings: LeverPosting[] }>(
            `https://api.lever.co/v0/postings/${company}?mode=json`
          );
          const jobs = Array.isArray(data) ? data : data.postings ?? [];
          return jobs.map((job) => ({
            title: job.text,
            company: titleCaseSlug(company),
            location: job.categories?.location ?? null,
            url: job.hostedUrl,
            externalId: job.id,
            publishedAt: job.createdAt ? new Date(job.createdAt).toISOString() : undefined,
            raw: job as unknown as Record<string, unknown>,
          }));
        },
        (company) => company
      );
    },
  };
}

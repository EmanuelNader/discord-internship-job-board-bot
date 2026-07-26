import type { SourceAdapter, RawPosting } from "@/lib/types";
import { adapterConfigs } from "@/config/adapters.config";
import { fetchJson, AdapterError } from "./base";

interface AshbyJob {
  id: string;
  title: string;
  location: string;
  jobUrl: string;
  department?: string;
}

interface AshbyResponse {
  jobs: AshbyJob[];
}

export function createAshbyAdapter(): SourceAdapter {
  const config = adapterConfigs.find((c) => c.name === "ashby");
  if (!config) throw new Error("Ashby config not found");

  return {
    name: "ashby",
    pollIntervalSec: config.pollIntervalSec,
    async fetchNewPostings(): Promise<RawPosting[]> {
      const postings: RawPosting[] = [];

      for (const company of config.companies) {
        try {
          const data = await fetchJson<AshbyResponse>(`https://jobs.ashbyhq.com/${company}`);
          for (const job of data.jobs) {
            postings.push({
              title: job.title,
              company: company.charAt(0).toUpperCase() + company.slice(1),
              location: job.location,
              url: job.jobUrl,
              externalId: job.id,
              raw: job as unknown as Record<string, unknown>,
            });
          }
        } catch (err) {
          throw new AdapterError("ashby", `Failed fetching ${company}`, err as Error);
        }
      }
      return postings;
    },
  };
}

import type { SourceAdapter, RawPosting } from "@/lib/types";
import { adapterConfigs } from "@/config/adapters.config";
import { fetchJson, AdapterError } from "./base";

interface GreenhouseJob {
  id: string;
  title: string;
  location?: { name: string } | null;
  absolute_url: string;
  metadata?: Array<{ name: string; value: string }>;
}

interface GreenhouseResponse {
  jobs: GreenhouseJob[];
  next?: string;
}

export function createGreenhouseAdapter(): SourceAdapter {
  const config = adapterConfigs.find((c) => c.name === "greenhouse");
  if (!config) throw new Error("Greenhouse config not found");

  return {
    name: "greenhouse",
    pollIntervalSec: config.pollIntervalSec,
    async fetchNewPostings(): Promise<RawPosting[]> {
      const postings: RawPosting[] = [];

      for (const company of config.companies) {
        let url = `https://boards.greenhouse.io/${company}/embed/jobboard?content=Job&method=json`;
        let hasMore = true;

        while (hasMore) {
          try {
            const data = await fetchJson<GreenhouseResponse>(url);
            for (const job of data.jobs) {
              postings.push({
                title: job.title,
                company: company.charAt(0).toUpperCase() + company.slice(1),
                location: job.location?.name ?? null,
                url: job.absolute_url,
                externalId: job.id,
                raw: job as unknown as Record<string, unknown>,
              });
            }
            hasMore = !!data.next;
            if (hasMore) url = `https://boards.greenhouse.io/${company}/embed/jobboard?content=Job&method=json&${data.next}`;
          } catch (err) {
            throw new AdapterError("greenhouse", `Failed fetching ${company}`, err as Error);
          }
        }
      }
      return postings;
    },
  };
}

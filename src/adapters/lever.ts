import type { SourceAdapter, RawPosting } from "@/lib/types";
import { adapterConfigs } from "@/config/adapters.config";
import { fetchJson, AdapterError } from "./base";

interface LeverPosting {
  id: string;
  text: string;
  categories: { location?: string; team?: string };
  applyUrl: string;
  hostedUrl: string;
}

interface LeverResponse {
  postings: LeverPosting[];
}

export function createLeverAdapter(): SourceAdapter {
  const config = adapterConfigs.find((c) => c.name === "lever");
  if (!config) throw new Error("Lever config not found");

  return {
    name: "lever",
    pollIntervalSec: config.pollIntervalSec,
    async fetchNewPostings(): Promise<RawPosting[]> {
      const postings: RawPosting[] = [];

      for (const company of config.companies) {
        try {
          const data = await fetchJson<LeverResponse>(`https://api.lever.co/v0/postings/${company}?mode=json`);
          for (const job of data.postings) {
            postings.push({
              title: job.text,
              company: company.charAt(0).toUpperCase() + company.slice(1),
              location: job.categories.location ?? null,
              url: job.hostedUrl,
              externalId: job.id,
              raw: job as unknown as Record<string, unknown>,
            });
          }
        } catch (err) {
          throw new AdapterError("lever", `Failed fetching ${company}`, err as Error);
        }
      }
      return postings;
    },
  };
}

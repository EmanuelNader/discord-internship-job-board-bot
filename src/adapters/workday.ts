import type { SourceAdapter, RawPosting } from "@/lib/types";
import { adapterConfigs } from "@/config/adapters.config";
import { fetchJson, AdapterError } from "./base";

interface WorkdayJob {
  jobId: string;
  title: string;
  locationsText: string;
  externalPath: string;
}

interface WorkdayResponse {
  jobPostings: WorkdayJob[];
  total: number;
  page: number;
  pageSize: number;
}

export function createWorkdayAdapter(): SourceAdapter {
  const config = adapterConfigs.find((c) => c.name === "workday");
  if (!config) throw new Error("Workday config not found");

  return {
    name: "workday",
    pollIntervalSec: config.pollIntervalSec,
    async fetchNewPostings(): Promise<RawPosting[]> {
      const postings: RawPosting[] = [];

      for (const company of config.companies) {
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          try {
            const data = await fetchJson<WorkdayResponse>(
              `https://${company}.wd1.myworkdayjobs.com/wd1/${company}/careers`,
              { method: "POST", body: JSON.stringify({ page, pageSize: 20 }) }
            );
            for (const job of data.jobPostings) {
              postings.push({
                title: job.title,
                company: company.charAt(0).toUpperCase() + company.slice(1),
                location: job.locationsText,
                url: `https://${company}.wd1.myworkdayjobs.com${job.externalPath}`,
                externalId: job.jobId,
                raw: job as unknown as Record<string, unknown>,
              });
            }
            hasMore = data.jobPostings.length === data.pageSize && page * data.pageSize < data.total;
            page++;
          } catch (err) {
            throw new AdapterError("workday", `Failed fetching ${company}`, err as Error);
          }
        }
      }
      return postings;
    },
  };
}

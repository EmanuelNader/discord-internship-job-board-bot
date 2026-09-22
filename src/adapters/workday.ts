import type { SourceAdapter, RawPosting } from "@/lib/types";
import { adapterConfigs } from "@/config/adapters.config";
import { fetchJson, collectFromTargets } from "./base";
import { workdayPostedAt } from "@/lib/workday-posted";

interface WorkdayJob {
  title?: string;
  locationsText?: string;
  externalPath: string;
  bulletFields?: string[];
  postedOn?: string;
  postedDate?: string;
}

interface WorkdayResponse {
  jobPostings: WorkdayJob[];
  total: number;
}

export function createWorkdayAdapter(): SourceAdapter {
  const config = adapterConfigs.find((c) => c.name === "workday");
  if (!config) throw new Error("Workday config not found");
  const boards = config.workdayBoards ?? [];

  return {
    name: "workday",
    pollIntervalSec: config.pollIntervalSec,
    async fetchNewPostings(): Promise<RawPosting[]> {
      return collectFromTargets(
        "workday",
        boards,
        async (board) => {
          const byId = new Map<string, RawPosting>();
          const pageSize = 20;
          const maxPages = 5;
          const searches = ["intern", "co-op"];

          for (const searchText of searches) {
            let offset = 0;
            for (let page = 0; page < maxPages; page++) {
              const data = await fetchJson<WorkdayResponse>(
                `https://${board.host}/wday/cxs/${board.tenant}/${board.site}/jobs`,
                {
                  method: "POST",
                  body: JSON.stringify({
                    appliedFacets: {},
                    limit: pageSize,
                    offset,
                    searchText,
                  }),
                }
              );
              const jobs = data.jobPostings ?? [];
              for (const job of jobs) {
                if (!job.title?.trim()) continue;
                const jobId = job.bulletFields?.[0] ?? job.externalPath;
                if (byId.has(jobId)) continue;
                byId.set(jobId, {
                  title: job.title,
                  company: board.name,
                  location: job.locationsText ?? null,
                  url: `https://${board.host}/${board.site}${job.externalPath}`,
                  externalId: jobId,
                  publishedAt: workdayPostedAt(job),
                  raw: job as unknown as Record<string, unknown>,
                });
              }
              if (jobs.length === 0) break;
              offset += jobs.length;
              if (offset >= (data.total ?? jobs.length)) break;
            }
          }
          return [...byId.values()];
        },
        (board) => board.name
      );
    },
  };
}

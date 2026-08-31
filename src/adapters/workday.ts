import type { SourceAdapter, RawPosting } from "@/lib/types";
import { adapterConfigs } from "@/config/adapters.config";
import { fetchJson, collectFromTargets } from "./base";

interface WorkdayJob {
  title: string;
  locationsText?: string;
  externalPath: string;
  bulletFields?: string[];
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
          const postings: RawPosting[] = [];
          const pageSize = 20;
          let offset = 0;
          let total = Infinity;

          while (offset < total) {
            const data = await fetchJson<WorkdayResponse>(
              `https://${board.host}/wday/cxs/${board.tenant}/${board.site}/jobs`,
              {
                method: "POST",
                body: JSON.stringify({
                  appliedFacets: {},
                  limit: pageSize,
                  offset,
                  searchText: "",
                }),
              }
            );
            const jobs = data.jobPostings ?? [];
            total = data.total ?? jobs.length;
            for (const job of jobs) {
              const jobId = job.bulletFields?.[0] ?? job.externalPath;
              postings.push({
                title: job.title,
                company: board.name,
                location: job.locationsText ?? null,
                url: `https://${board.host}/${board.site}${job.externalPath}`,
                externalId: jobId,
                raw: job as unknown as Record<string, unknown>,
              });
            }
            if (jobs.length === 0) break;
            offset += jobs.length;
          }
          return postings;
        },
        (board) => board.name
      );
    },
  };
}

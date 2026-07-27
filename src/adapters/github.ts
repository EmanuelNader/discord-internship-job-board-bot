import type { SourceAdapter, RawPosting } from "@/lib/types";
import { adapterConfigs } from "@/config/adapters.config";
import { fetchJson, AdapterError } from "./base";

interface GithubIssue {
  number: number;
  title: string;
  html_url: string;
  body: string | null;
  created_at: string;
}

function parseIssueBody(body: string): { company?: string; role?: string; location?: string; link?: string } {
  const result: Record<string, string> = {};
  for (const line of body.split("\n")) {
    const idx = line.indexOf(":");
    if (idx > 0) {
      const key = line.slice(0, idx).trim().toLowerCase();
      const value = line.slice(idx + 1).trim();
      result[key] = value;
    }
  }
  return {
    company: result["company"],
    role: result["role"],
    location: result["location"],
    link: result["link"],
  };
}

export function createGithubAdapter(): SourceAdapter {
  const config = adapterConfigs.find((c) => c.name === "github");
  if (!config) throw new Error("GitHub config not found");

  const headers: Record<string, string> = {};
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  return {
    name: "github",
    pollIntervalSec: config.pollIntervalSec,
    async fetchNewPostings(): Promise<RawPosting[]> {
      const postings: RawPosting[] = [];

      for (const repo of config.companies) {
        try {
          const [owner, repoName] = repo.split("/");
          const issues = await fetchJson<GithubIssue[]>(
            `https://api.github.com/repos/${owner}/${repoName}/issues?state=open&per_page=100`,
            { headers }
          );
          for (const issue of issues) {
            const parsed = parseIssueBody(issue.body ?? "");
            const title = parsed.role ?? issue.title.replace(/^\[.+?\]\s*/, "");
            postings.push({
              title,
              company: parsed.company ?? "Unknown",
              location: parsed.location ?? null,
              url: parsed.link ?? issue.html_url,
              externalId: `${repo}-${issue.number}`,
              publishedAt: issue.created_at,
              raw: { issueNumber: issue.number, repo, title: issue.title },
            });
          }
        } catch (err) {
          throw new AdapterError("github", `Failed fetching ${repo}`, err as Error);
        }
      }
      return postings;
    },
  };
}

import type { SourceAdapter, RawPosting } from "@/lib/types";
import { adapterConfigs } from "@/config/adapters.config";
import { fetchHtml, collectFromTargets } from "./base";
import { parseInternshipListings } from "./github-readme";

function parseTarget(entry: string): { repo: string; path: string } {
  const hash = entry.indexOf("#");
  if (hash >= 0) {
    return { repo: entry.slice(0, hash), path: entry.slice(hash + 1) || "README.md" };
  }
  return { repo: entry, path: "README.md" };
}

export function githubMaxAgeDays(): number {
  const raw = process.env.GITHUB_MAX_AGE_DAYS;
  const n = raw ? Number(raw) : 14;
  return Number.isFinite(n) && n >= 1 ? n : 14;
}

export function createGithubAdapter(): SourceAdapter {
  const config = adapterConfigs.find((c) => c.name === "github");
  if (!config) throw new Error("GitHub config not found");

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.raw",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  return {
    name: "github",
    pollIntervalSec: config.pollIntervalSec,
    async fetchNewPostings(): Promise<RawPosting[]> {
      const maxAge = githubMaxAgeDays();

      return collectFromTargets(
        "github",
        config.companies,
        async (entry) => {
          const { repo, path } = parseTarget(entry);
          const [owner, repoName] = repo.split("/");
          const encodedPath = path.split("/").map(encodeURIComponent).join("/");
          const markdown = await fetchHtml(
            `https://api.github.com/repos/${owner}/${repoName}/contents/${encodedPath}`,
            headers
          );
          const listings = parseInternshipListings(markdown);
          return listings
            .filter((row) => !row.closed)
            .filter((row) => row.ageDays == null || row.ageDays <= maxAge)
            .map((row) => ({
              title: row.title,
              company: row.company,
              location: row.location,
              url: row.url,
              externalId: `${repo}#${path}#${row.url}`,
              publishedAt:
                row.ageDays != null
                  ? new Date(Date.now() - row.ageDays * 86400000).toISOString()
                  : undefined,
              raw: { repo, path, ageDays: row.ageDays },
            }));
        },
        (entry) => entry
      );
    },
  };
}

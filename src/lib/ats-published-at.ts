import { fetchJson } from "@/adapters/base";

const GREENHOUSE_JOB = /greenhouse\.io\/([^/?#]+)\/jobs\/(\d+)/i;

export async function resolveAtsPublishedAt(url: string): Promise<Date | null> {
  const match = url.match(GREENHOUSE_JOB);
  if (!match) return null;

  try {
    const job = await fetchJson<{ first_published?: string }>(
      `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(match[1])}/jobs/${match[2]}`
    );
    if (!job.first_published) return null;
    const posted = new Date(job.first_published);
    return Number.isNaN(posted.getTime()) ? null : posted;
  } catch {
    return null;
  }
}

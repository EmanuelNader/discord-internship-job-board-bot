import { startOfUtcDay, utcDaysAgo } from "@/lib/freshness";

/** Workday CXS often sends "Posted 6 Days Ago" instead of an ISO date. */
export function parseWorkdayPostedOn(value: string | null | undefined, now = new Date()): Date | null {
  if (!value?.trim()) return null;
  const text = value.trim();

  const iso = new Date(text);
  if (!Number.isNaN(iso.getTime()) && /\d{4}/.test(text)) return iso;

  if (/posted\s+today/i.test(text)) return startOfUtcDay(now);

  const days = text.match(/posted\s+(\d+)\+?\s*days?\s+ago/i);
  if (days) return utcDaysAgo(now, Number(days[1]));

  return null;
}

export function workdayPostedAt(
  job: { postedOn?: string; postedDate?: string },
  now = new Date()
): string | undefined {
  const raw = job.postedOn ?? job.postedDate;
  const parsed = parseWorkdayPostedOn(raw, now);
  return parsed ? parsed.toISOString() : undefined;
}

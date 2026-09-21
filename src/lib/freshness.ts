export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function utcDaysAgo(date: Date, days: number): Date {
  const d = startOfUtcDay(date);
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

/** True only when the listing has a published date on or after the guild's onboard day. */
export function isPostedOnOrAfter(publishedAt: Date | null, liveSince: Date): boolean {
  if (!publishedAt || Number.isNaN(publishedAt.getTime())) return false;
  return publishedAt.getTime() >= startOfUtcDay(liveSince).getTime();
}

export function publishedAtMs(publishedAt: Date | string | null | undefined): number | null {
  if (publishedAt == null || publishedAt === "") return null;
  const t = publishedAt instanceof Date ? publishedAt.getTime() : Date.parse(String(publishedAt));
  return Number.isNaN(t) ? null : t;
}

/** Newest publishedAt first. Listings with no date sort last (stable). */
export function sortNewestFirst<T extends { publishedAt?: Date | string | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ta = publishedAtMs(a.publishedAt);
    const tb = publishedAtMs(b.publishedAt);
    if (ta === null && tb === null) return 0;
    if (ta === null) return 1;
    if (tb === null) return -1;
    return tb - ta;
  });
}

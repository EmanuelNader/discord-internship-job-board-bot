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

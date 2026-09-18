export interface AppEnv {
  DISCORD_TOKEN: string;
  DATABASE_URL: string;
  /** Optional. Recommended so GitHub README polls are not rate-limited. */
  GITHUB_TOKEN?: string;
  BACKFILL: boolean;
  BACKFILL_LIMIT: number;
  GITHUB_MAX_AGE_DAYS: number;
  /** Days of already-posted listings to include on first join. 0 = onboard day only. */
  INITIAL_LOOKBACK_DAYS: number;
  NODE_ENV: string;
}

export function validateEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  const missing: string[] = [];
  if (!env.DISCORD_TOKEN?.trim()) missing.push("DISCORD_TOKEN");
  if (!env.DATABASE_URL?.trim()) missing.push("DATABASE_URL");
  if (missing.length > 0) {
    throw new Error(`Missing required env: ${missing.join(", ")}`);
  }

  const limitRaw = env.BACKFILL_LIMIT;
  const limit = limitRaw ? Number(limitRaw) : 50;
  if (!Number.isFinite(limit) || limit < 1) {
    throw new Error("BACKFILL_LIMIT must be a positive number");
  }

  const ageRaw = env.GITHUB_MAX_AGE_DAYS;
  const maxAgeDays = ageRaw ? Number(ageRaw) : 14;
  if (!Number.isFinite(maxAgeDays) || maxAgeDays < 1) {
    throw new Error("GITHUB_MAX_AGE_DAYS must be a positive number");
  }

  const lookbackRaw = env.INITIAL_LOOKBACK_DAYS;
  const lookbackDays = lookbackRaw ? Number(lookbackRaw) : 7;
  if (!Number.isFinite(lookbackDays) || lookbackDays < 0) {
    throw new Error("INITIAL_LOOKBACK_DAYS must be a number >= 0");
  }

  return {
    DISCORD_TOKEN: env.DISCORD_TOKEN!,
    DATABASE_URL: env.DATABASE_URL!,
    GITHUB_TOKEN: env.GITHUB_TOKEN?.trim() || undefined,
    BACKFILL: env.BACKFILL === "true",
    BACKFILL_LIMIT: limit,
    GITHUB_MAX_AGE_DAYS: maxAgeDays,
    INITIAL_LOOKBACK_DAYS: lookbackDays,
    NODE_ENV: env.NODE_ENV ?? "development",
  };
}

export interface AppEnv {
  DISCORD_TOKEN: string;
  DATABASE_URL: string;
  GITHUB_TOKEN?: string;
  BACKFILL: boolean;
  BACKFILL_LIMIT: number;
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

  return {
    DISCORD_TOKEN: env.DISCORD_TOKEN!,
    DATABASE_URL: env.DATABASE_URL!,
    GITHUB_TOKEN: env.GITHUB_TOKEN?.trim() || undefined,
    BACKFILL: env.BACKFILL === "true",
    BACKFILL_LIMIT: limit,
    NODE_ENV: env.NODE_ENV ?? "development",
  };
}

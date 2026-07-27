import type { SourceAdapter, RawPosting } from "@/lib/types";
import { adapterConfigs } from "@/config/adapters.config";

export function createCustomAdapter(): SourceAdapter {
  const config = adapterConfigs.find((c) => c.name === "custom");
  if (!config) throw new Error("Custom adapter config not found");

  return {
    name: "custom",
    pollIntervalSec: config.pollIntervalSec,
    async fetchNewPostings(): Promise<RawPosting[]> {
      // Stub — custom scrapers not yet implemented for proprietary ATS systems.
      // Companies: amazon, microsoft, meta, apple, google, netflix, oracle, linkedin, spotify, bytedance-tiktok
      return [];
    },
  };
}

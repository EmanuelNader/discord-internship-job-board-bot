import type { SourceName } from "@/lib/types";

export interface AdapterConfig {
  name: SourceName;
  enabled: boolean;
  pollIntervalSec: number;
  companies: string[]; // company slugs for ATS; repo names for GitHub
}

export const adapterConfigs: AdapterConfig[] = [
  { name: "greenhouse", enabled: true, pollIntervalSec: 300, companies: ["google", "microsoft", "amazon", "meta", "apple"] },
  { name: "ashby", enabled: true, pollIntervalSec: 300, companies: ["stripe", "airbnb", "coinbase", "databricks", "notion"] },
  { name: "lever", enabled: true, pollIntervalSec: 300, companies: ["shopify", "discord", "figma", "linear", "vercel"] },
  { name: "workday", enabled: true, pollIntervalSec: 300, companies: ["nvidia", "intel", "amd", "qualcomm", "salesforce"] },
  { name: "simplify", enabled: true, pollIntervalSec: 900, companies: [] }, // Simplify uses different discovery
  { name: "github", enabled: true, pollIntervalSec: 900, companies: ["SimplifyJobs/Summer2026-Internships", "pittcsc/PittCSWindow"] },
];
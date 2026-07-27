import type { SourceName } from "@/lib/types";

export interface AdapterConfig {
  name: SourceName;
  enabled: boolean;
  pollIntervalSec: number;
  companies: string[]; // company slugs for ATS; repo names for GitHub
}

export const adapterConfigs: AdapterConfig[] = [
  { name: "greenhouse", enabled: true, pollIntervalSec: 300, companies: [
    "spacex", "andurilindustries", "airtable", "airbnb", "fireworksai", "figma", "twitch", "neuralink",
    "robinhood", "xai", "anthropic", "reddit", "cloudflare", "scaleai", "lyft",
    "stripe", "discord", "brex", "squarespace", "clear", "affirm",
    "crunchyroll", "nuro", "pallet", "pinterest", "astranis", "waymo", "figureai", "merge",
    "databricks", "datadog", "dropbox", "instacart", "mongodb", "twilio", "block",
    "gitlab", "vercel", "thinkingmachines", "togetherai", "hightouch", "roblox",
    "jumptrading", "akunacapital", "optiver", "imc", "chicagotrading",
    "coinbase", "snap", "uber"
  ]},
  { name: "ashby", enabled: false, pollIntervalSec: 300, companies: [
    "chalk", "notion", "ramp", "snowflake", "decagon", "distyl", "elevenlabs", "flow-engineering",
    "baseten", "browserbase", "base-power-company", "clickup", "apex-technology-inc", "light",
    "linear", "sift", "stack", "gigaml", "sesame", "happyrobot", "granola", "sunday",
    "openai", "perplexity", "pylon", "cohere", "traversal", "harvey", "sentry", "braintrust",
    "eliseai", "resolve-ai", "mintlify", "roadrunner", "supabase", "wispr-flow", "flint",
    "cursor", "modal-labs", "langchain", "cognition", "paraform", "judgment-labs",
    "general-intelligence-company", "saronic", "plaid", "exa", "trajectory", "krea",
    "vizcom", "posthog", "poke", "sierra", "workweave", "reducto", "console", "workoss", "salient"
  ]},
  { name: "lever", enabled: false, pollIntervalSec: 300, companies: [
    "palantir", "spotify", "zoox", "belvedere-trading"
  ]},
  { name: "workday", enabled: false, pollIntervalSec: 300, companies: [
    "adobe", "nvidia", "salesforce", "expedia", "turo", "blue-origin",
    "general-motors", "disney", "slack", "capital-one", "paypal"
  ]},
  { name: "simplify", enabled: true, pollIntervalSec: 900, companies: [] },
  { name: "github", enabled: true, pollIntervalSec: 900, companies: [
    "SimplifyJobs/Summer2026-Internships",
    "vanshb03/Summer2027-Internships",
    "speedyapply/2027-SWE-College-Jobs"
  ]},
  // Custom/proprietary ATS — scrapers not yet implemented
  { name: "custom", enabled: false, pollIntervalSec: 3600, companies: [
    "amazon", "microsoft", "meta", "apple", "google",
    "netflix", "oracle", "linkedin", "spotify", "bytedance-tiktok"
  ]},
];
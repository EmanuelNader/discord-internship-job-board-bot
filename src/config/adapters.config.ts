import type { SourceName } from "@/lib/types";

export interface WorkdayBoard {
  name: string;
  host: string;
  tenant: string;
  site: string;
}

export interface AdapterConfig {
  name: SourceName;
  enabled: boolean;
  pollIntervalSec: number;
  companies: string[]; // company slugs for ATS; owner/repo[#path] for GitHub
  workdayBoards?: WorkdayBoard[];
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
    "coinbase", "snap", "uber",
    "doordash", "asana", "rippling", "okta", "hubspot", "flexport", "chime", "sofi",
  ]},
  { name: "ashby", enabled: true, pollIntervalSec: 300, companies: [
    "chalk", "notion", "ramp", "snowflake", "decagon", "distyl", "elevenlabs", "flow-engineering",
    "baseten", "browserbase", "base-power-company", "clickup", "apex-technology-inc", "light",
    "linear", "sift", "stack", "gigaml", "sesame", "happyrobot", "granola", "sunday",
    "openai", "perplexity", "pylon", "cohere", "traversal", "harvey", "sentry", "braintrust",
    "eliseai", "resolve-ai", "mintlify", "roadrunner", "supabase", "wispr-flow", "flint",
    "cursor", "modal-labs", "langchain", "cognition", "paraform", "judgment-labs",
    "general-intelligence-company", "saronic", "plaid", "exa", "trajectory", "krea",
    "vizcom", "posthog", "poke", "sierra", "workweave", "reducto", "console", "workoss", "salient",
    "replit", "vanta", "mercury",
  ]},
  { name: "lever", enabled: true, pollIntervalSec: 300, companies: [
    "palantir", "spotify", "zoox", "belvederetrading", "duolingo", "box",
  ]},
  { name: "workday", enabled: true, pollIntervalSec: 300, companies: [
    "nvidia", "adobe", "salesforce", "paypal", "blue-origin", "disney", "slack",
  ], workdayBoards: [
    { name: "NVIDIA", host: "nvidia.wd5.myworkdayjobs.com", tenant: "nvidia", site: "NVIDIAExternalCareerSite" },
    { name: "Adobe", host: "adobe.wd5.myworkdayjobs.com", tenant: "adobe", site: "external_experienced" },
    { name: "Salesforce", host: "salesforce.wd12.myworkdayjobs.com", tenant: "salesforce", site: "External_Career_Site" },
    { name: "PayPal", host: "paypal.wd1.myworkdayjobs.com", tenant: "paypal", site: "jobs" },
    { name: "Blue Origin", host: "blueorigin.wd5.myworkdayjobs.com", tenant: "blueorigin", site: "BlueOrigin" },
    { name: "Disney", host: "disney.wd5.myworkdayjobs.com", tenant: "disney", site: "disneycareer" },
    { name: "Slack", host: "salesforce.wd12.myworkdayjobs.com", tenant: "salesforce", site: "Slack" },
  ]},
  { name: "simplify", enabled: false, pollIntervalSec: 900, companies: [] },
  { name: "github", enabled: true, pollIntervalSec: 900, companies: [
    "SimplifyJobs/Summer2027-Internships",
    "SimplifyJobs/Summer2027-Internships#README-Off-Season.md",
    "vanshb03/Summer2027-Internships",
    "speedyapply/2027-SWE-College-Jobs",
  ]},
  // Custom/proprietary ATS — scrapers not yet implemented
  { name: "custom", enabled: false, pollIntervalSec: 3600, companies: [
    "amazon", "microsoft", "meta", "apple", "google",
    "netflix", "oracle", "linkedin", "spotify", "bytedance-tiktok"
  ]},
];

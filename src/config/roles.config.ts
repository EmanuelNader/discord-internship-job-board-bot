import type { RoleFamily, RoleTitle } from "@/lib/types";

/**
 * Family settings live here — not in .env and not in the Discord portal.
 * Set `enabled: false` to hide that family’s channel, onboard emoji, /role option, and posts.
 * After a change, run `/setup` then `/onboard`. `/settings` lists the current values in Discord.
 */

export interface RoleTitleConfig {
  title: RoleTitle;
  roleName: string;      // Legacy Discord role name; deleted on setup
  description: string;
}

export interface RoleFamilyConfig {
  family: RoleFamily;
  channelName: string;   // e.g., "swe-jobs"
  emoji: string;         // Unicode emoji for /onboard reaction roles
  roleName: string;     // Discord ping role (one per family)
  enabled: boolean;     // false: skip channel/role provision, onboard, /role, and posting
  titles: RoleTitleConfig[];
}

export const roleFamilies: RoleFamilyConfig[] = [
  {
    family: "swe",
    channelName: "swe-jobs",
    emoji: "💻",
    roleName: "SWE",
    enabled: true,
    titles: [
      { title: "swe-frontend", roleName: "SWE - Frontend", description: "Frontend engineering internships" },
      { title: "swe-backend", roleName: "SWE - Backend", description: "Backend engineering internships" },
      { title: "swe-fullstack", roleName: "SWE - Fullstack", description: "Fullstack engineering internships" },
      { title: "swe-mobile", roleName: "SWE - Mobile", description: "Mobile engineering internships" },
      { title: "swe-devops", roleName: "SWE - DevOps", description: "DevOps/SRE internships" },
      { title: "swe-embedded", roleName: "SWE - Embedded", description: "Embedded/firmware internships" },
    ],
  },
  {
    family: "pm-program",
    channelName: "pm-program-jobs",
    emoji: "📋",
    roleName: "PM",
    enabled: true,
    titles: [
      { title: "pm-product", roleName: "PM - Product", description: "Product management internships" },
      { title: "pm-program", roleName: "PM - Program", description: "Program management internships" },
      { title: "pm-tpm", roleName: "PM - TPM", description: "Technical program management internships" },
    ],
  },
  {
    family: "hardware",
    channelName: "hardware-jobs",
    emoji: "🔌",
    roleName: "Hardware",
    enabled: true,
    titles: [
      { title: "hw-silicon", roleName: "HW - Silicon", description: "Silicon/VLSI internships" },
      { title: "hw-pcb", roleName: "HW - PCB", description: "PCB design internships" },
      { title: "hw-fpga", roleName: "HW - FPGA", description: "FPGA engineering internships" },
      { title: "hw-asic", roleName: "HW - ASIC", description: "ASIC/verification internships" },
    ],
  },
  {
    family: "data",
    channelName: "data-jobs",
    emoji: "📊",
    roleName: "Data",
    enabled: true,
    titles: [
      { title: "data-scientist", roleName: "Data - Scientist", description: "Data science internships" },
      { title: "data-engineer", roleName: "Data - Engineer", description: "Data engineering internships" },
      { title: "data-analytics", roleName: "Data - Analytics", description: "Analytics internships" },
    ],
  },
  {
    family: "ml",
    channelName: "ml-ai-jobs",
    emoji: "🤖",
    roleName: "ML",
    enabled: true,
    titles: [
      { title: "ml-engineer", roleName: "ML - Engineer", description: "ML engineering internships" },
      { title: "ml-researcher", roleName: "ML - Researcher", description: "ML research internships" },
      { title: "ml-ai-eng", roleName: "ML - AI Engineer", description: "AI engineering internships" },
    ],
  },
  {
    family: "civil-structural",
    channelName: "civil-structural-jobs",
    emoji: "🌉",
    roleName: "Civil/Structural",
    enabled: true,
    titles: [
      { title: "eng-structural", roleName: "Eng - Structural", description: "Structural engineering internships" },
      { title: "eng-civil", roleName: "Eng - Civil", description: "Civil engineering internships" },
    ],
  },
  {
    family: "mechanical",
    channelName: "mechanical-jobs",
    emoji: "⚙️",
    roleName: "Mechanical",
    enabled: true,
    titles: [
      { title: "eng-mechanical", roleName: "Eng - Mechanical", description: "Mechanical engineering internships" },
    ],
  },
  {
    family: "electrical",
    channelName: "electrical-jobs",
    emoji: "⚡",
    roleName: "Electrical",
    enabled: true,
    titles: [
      { title: "eng-electrical", roleName: "Eng - Electrical", description: "Electrical engineering internships" },
    ],
  },
  {
    family: "chemical",
    channelName: "chemical-jobs",
    emoji: "🧪",
    roleName: "Chemical",
    enabled: true,
    titles: [
      { title: "eng-chemical", roleName: "Eng - Chemical", description: "Chemical engineering internships" },
    ],
  },
  {
    family: "aerospace",
    channelName: "aerospace-jobs",
    emoji: "🚀",
    roleName: "Aerospace",
    enabled: true,
    titles: [
      { title: "eng-aerospace", roleName: "Eng - Aerospace", description: "Aerospace engineering internships" },
    ],
  },
  {
    family: "other",
    channelName: "other-jobs",
    emoji: "📦",
    roleName: "Other",
    enabled: true,
    titles: [
      { title: "design-ux", roleName: "Design - UX", description: "UX design internships" },
      { title: "design-ui", roleName: "Design - UI", description: "UI design internships" },
      { title: "design-product", roleName: "Design - Product", description: "Product design internships" },
      { title: "design-interaction", roleName: "Design - Interaction", description: "Interaction design internships" },
      { title: "growth-general", roleName: "Growth - General", description: "General growth marketing internships" },
      { title: "growth-lifecycle", roleName: "Growth - Lifecycle", description: "Lifecycle marketing internships" },
      { title: "growth-acquisition", roleName: "Growth - Acquisition", description: "User acquisition internships" },
    ],
  },
];

export function getEnabledRoleFamilies(): RoleFamilyConfig[] {
  return roleFamilies.filter((family) => family.enabled);
}

export function filterEnabledRoleFamilies(families: string[]): RoleFamily[] {
  const enabled = new Set(getEnabledRoleFamilies().map((family) => family.family));
  return families.filter((family): family is RoleFamily => enabled.has(family as RoleFamily));
}

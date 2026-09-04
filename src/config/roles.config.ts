import type { RoleFamily, RoleTitle } from "@/lib/types";

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
  titles: RoleTitleConfig[];
}

export const roleFamilies: RoleFamilyConfig[] = [
  {
    family: "swe",
    channelName: "swe-jobs",
    emoji: "💻",
    roleName: "SWE",
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
    titles: [
      { title: "ml-engineer", roleName: "ML - Engineer", description: "ML engineering internships" },
      { title: "ml-researcher", roleName: "ML - Researcher", description: "ML research internships" },
      { title: "ml-ai-eng", roleName: "ML - AI Engineer", description: "AI engineering internships" },
    ],
  },
  {
    family: "engineering",
    channelName: "engineering-jobs",
    emoji: "⚙️",
    roleName: "Engineering",
    titles: [
      { title: "eng-structural", roleName: "Eng - Structural", description: "Structural engineering internships" },
      { title: "eng-civil", roleName: "Eng - Civil", description: "Civil engineering internships" },
      { title: "eng-electrical", roleName: "Eng - Electrical", description: "Electrical engineering internships" },
      { title: "eng-mechanical", roleName: "Eng - Mechanical", description: "Mechanical engineering internships" },
      { title: "eng-chemical", roleName: "Eng - Chemical", description: "Chemical engineering internships" },
      { title: "eng-aerospace", roleName: "Eng - Aerospace", description: "Aerospace engineering internships" },
    ],
  },
  {
    family: "design",
    channelName: "design-jobs",
    emoji: "🎨",
    roleName: "Design",
    titles: [
      { title: "design-ux", roleName: "Design - UX", description: "UX design internships" },
      { title: "design-ui", roleName: "Design - UI", description: "UI design internships" },
      { title: "design-product", roleName: "Design - Product", description: "Product design internships" },
      { title: "design-interaction", roleName: "Design - Interaction", description: "Interaction design internships" },
    ],
  },
  {
    family: "growth",
    channelName: "growth-jobs",
    emoji: "📈",
    roleName: "Growth",
    titles: [
      { title: "growth-general", roleName: "Growth - General", description: "General growth marketing internships" },
      { title: "growth-lifecycle", roleName: "Growth - Lifecycle", description: "Lifecycle marketing internships" },
      { title: "growth-acquisition", roleName: "Growth - Acquisition", description: "User acquisition internships" },
    ],
  },
];
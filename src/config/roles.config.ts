import type { RoleFamily, RoleTitle } from "@/lib/types";

export interface RoleTitleConfig {
  title: RoleTitle;
  roleName: string;      // Discord role name (e.g., "SWE - Frontend")
  description: string;   // For /role autocomplete
}

export interface RoleFamilyConfig {
  family: RoleFamily;
  channelName: string;   // e.g., "swe-jobs"
  titles: RoleTitleConfig[];
}

export const roleFamilies: RoleFamilyConfig[] = [
  {
    family: "swe",
    channelName: "swe-jobs",
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
    titles: [
      { title: "pm-product", roleName: "PM - Product", description: "Product management internships" },
      { title: "pm-program", roleName: "PM - Program", description: "Program management internships" },
      { title: "pm-tpm", roleName: "PM - TPM", description: "Technical program management internships" },
    ],
  },
  {
    family: "hardware",
    channelName: "hardware-jobs",
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
    titles: [
      { title: "data-scientist", roleName: "Data - Scientist", description: "Data science internships" },
      { title: "data-engineer", roleName: "Data - Engineer", description: "Data engineering internships" },
      { title: "data-analytics", roleName: "Data - Analytics", description: "Analytics internships" },
    ],
  },
  {
    family: "ml",
    channelName: "ml-ai-jobs",
    titles: [
      { title: "ml-engineer", roleName: "ML - Engineer", description: "ML engineering internships" },
      { title: "ml-researcher", roleName: "ML - Researcher", description: "ML research internships" },
      { title: "ml-ai-eng", roleName: "ML - AI Engineer", description: "AI engineering internships" },
    ],
  },
  {
    family: "engineering",
    channelName: "engineering-jobs",
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
    titles: [
      { title: "growth-general", roleName: "Growth - General", description: "General growth marketing internships" },
      { title: "growth-lifecycle", roleName: "Growth - Lifecycle", description: "Lifecycle marketing internships" },
      { title: "growth-acquisition", roleName: "Growth - Acquisition", description: "User acquisition internships" },
    ],
  },
];
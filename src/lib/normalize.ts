import type { RawPosting, Level, RoleFamily } from "./types";

const INCLUDE_INTERNSHIP = /\b(intern|internship|summer\s+202\d|fall\s+202\d|spring\s+202\d)\b/i;
const INCLUDE_COOP = /\b(co[- ]?op|cooperative\s+education|placement\s+year)\b/i;
const INCLUDE_FELLOWSHIP = /\b(fellowship|fellow|fellows\s+program)\b/i;
const NAMED_FELLOWSHIPS = /\b(xrds|google\s+phd|fb\s+fellowship|facebook\s+fellowship|microsoft\s+research\s+phd|nvidia\s+graduate\s+fellowship)\b/i;

const DROP_SENIORITY = /\b(senior|staff|principal|manager(?!\s+of\s+\w+\s+intern)|head\s+of|director|vp\b|lead\b)/i;
const DROP_NEWGRAD = /\b(new\s+grad|new\s+graduate|graduate\s+program|early\s+career|development\s+program|rotational\s+program|campus\s+hire|entry\s+level|campus\s+to\s+career)\b/i;

export function detectLevel(title: string, _raw?: RawPosting): Level | null {
  const norm = title.trim().replace(/\s+/g, " ").toLowerCase();

  if (DROP_NEWGRAD.test(norm)) return null;

  const isInternship = INCLUDE_INTERNSHIP.test(norm);
  const isCoop = INCLUDE_COOP.test(norm);
  const isFellowship = INCLUDE_FELLOWSHIP.test(norm) || NAMED_FELLOWSHIPS.test(norm);

  if (!isInternship && !isCoop && !isFellowship) return null;

  if (DROP_SENIORITY.test(norm)) {
    if (!isInternship && !isCoop && !isFellowship) return null;
  }

  if (isFellowship) return "fellowship";
  if (isCoop) return "co-op";
  return "internship";
}

const FAMILY_KEYWORDS: Record<RoleFamily, RegExp[]> = {
  swe: [
    /\b(frontend|front[- ]?end)\b/i,
    /\b(backend|back[- ]?end)\b/i,
    /\b(full[- ]?stack|fullstack)\b/i,
    /\b(mobile|ios|android)\b/i,
    /\b(devops|dev[- ]?ops|sre|site\s+reliability)\b/i,
    /\b(embedded|firmware)\b/i,
    /\b(software\s+engineer|swe\b)\b/i,
  ],
  "pm-program": [
    /\b(product\s+manager|pm\b)\b/i,
    /\b(technical\s+program\s+manager|tpm\b)\b/i,
    /\b(program\s+manager)\b/i,
  ],
  hardware: [
    /\b(silicon|vlsi|chip\s+design)\b/i,
    /\b(pcb|printed\s+circuit\s+board)\b/i,
    /\b(fpga)\b/i,
    /\b(asic|verification|physical\s+design)\b/i,
    /\b(hardware)\b/i,
  ],
  data: [
    /\b(data\s+scientist)\b/i,
    /\b(data\s+engineer)\b/i,
    /\b(analytics|data\s+analyst)\b/i,
  ],
  ml: [
    /\b(machine\s+learning|ml\s+engineer)\b/i,
    /\b(ml\s+researcher|machine\s+learning\s+research)\b/i,
    /\b(ai\s+engineer|artificial\s+intelligence\s+engineer)\b/i,
  ],
  engineering: [
    /\b(structural\s+engineer(?:ing)?)\b/i,
    /\b(civil\s+engineer(?:ing)?)\b/i,
    /\b(electrical\s+engineer(?:ing)?)\b/i,
    /\b(mechanical\s+engineer(?:ing)?)\b/i,
    /\b(chemical\s+engineer(?:ing)?)\b/i,
    /\b(aerospace\s+engineer(?:ing)?)\b/i,
  ],
  design: [
    /\b(ux\s+designer|user\s+experience\s+designer)\b/i,
    /\b(ui\s+designer|user\s+interface\s+designer)\b/i,
    /\b(product\s+designer)\b/i,
    /\b(interaction\s+designer)\b/i,
  ],
  growth: [
    /\b(growth\s+marketing|growth\s+engineer)\b/i,
    /\b(lifecycle\s+marketing)\b/i,
    /\b(user\s+acquisition|acquisition\s+marketing)\b/i,
  ],
};

export function detectRoleFamily(title: string, _raw?: RawPosting): RoleFamily[] {
  const norm = title.trim().replace(/\s+/g, " ").toLowerCase();
  const families: RoleFamily[] = [];
  for (const [family, patterns] of Object.entries(FAMILY_KEYWORDS)) {
    if (patterns.some((re) => re.test(norm))) {
      families.push(family as RoleFamily);
    }
  }
  return families;
}
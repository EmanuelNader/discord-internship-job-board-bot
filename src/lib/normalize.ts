import type { RawPosting, Level } from "./types";

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
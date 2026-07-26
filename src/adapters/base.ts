import type { RawPosting, SourceName } from "@/lib/types";

export class AdapterError extends Error {
  constructor(public readonly source: SourceName, message: string, public readonly cause?: Error) {
    super(`[${source}] ${message}`);
    this.name = "AdapterError";
  }
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { "User-Agent": "InternshipJobBoardBot/1.0" }, ...init });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

export async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": "InternshipJobBoardBot/1.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.text();
}

export function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ").toLowerCase();
}

export function normalizeCompany(company: string): string {
  return company.trim().replace(/\s+/g, " ").toLowerCase();
}
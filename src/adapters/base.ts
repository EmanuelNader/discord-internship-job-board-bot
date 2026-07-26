import type { RawPosting, SourceName } from "@/lib/types";
import { get } from "node:https";
import { get as getHttp } from "node:http";

export class AdapterError extends Error {
  constructor(public readonly source: SourceName, message: string, public readonly cause?: Error) {
    super(`[${source}] ${message}`);
    this.name = "AdapterError";
  }
}

function requestJson(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const fn = url.startsWith("https:") ? get : getHttp;
    const req = fn(url, { headers: { "User-Agent": "InternshipJobBoardBot/1.0" } }, (res) => {
      let body = "";
      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        res.resume();
        return;
      }
      res.setEncoding("utf8");
      res.on("data", (chunk: string) => (body += chunk));
      res.on("end", () => resolve(body));
    });
    req.on("error", reject);
  });
}

export async function fetchJson<T>(url: string, _init?: RequestInit): Promise<T> {
  const body = await requestJson(url);
  return JSON.parse(body) as T;
}

export async function fetchHtml(url: string): Promise<string> {
  return requestJson(url);
}

export function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ").toLowerCase();
}

export function normalizeCompany(company: string): string {
  return company.trim().replace(/\s+/g, " ").toLowerCase();
}
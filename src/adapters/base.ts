import type { RawPosting, SourceName } from "@/lib/types";
import { request as httpsRequest } from "node:https";
import { request as httpRequest } from "node:http";

export class AdapterError extends Error {
  constructor(public readonly source: SourceName, message: string, public readonly cause?: Error) {
    super(`[${source}] ${message}`);
    this.name = "AdapterError";
  }
}

interface JsonOptions {
  method?: string;
  body?: string;
  headers?: Record<string, string>;
}

function requestJson(url: string, opts?: JsonOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith("https:");
    const fn = isHttps ? httpsRequest : httpRequest;
    const req = fn(url, { method: opts?.method ?? "GET", headers: { "User-Agent": "InternshipJobBoardBot/1.0", ...(opts?.body ? { "Content-Type": "application/json" } : {}), ...(opts?.headers ?? {}) } }, (res) => {
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
    if (opts?.body) req.write(opts.body);
    req.end();
  });
}

export async function fetchJson<T>(url: string, opts?: JsonOptions): Promise<T> {
  const body = await requestJson(url, opts);
  return JSON.parse(body) as T;
}

export async function fetchHtml(url: string, headers?: Record<string, string>): Promise<string> {
  return requestJson(url, { headers });
}

/** Fetch each target independently so one HTTP failure does not abort the rest. */
export async function collectFromTargets<T, R>(
  source: SourceName,
  items: T[],
  fetchOne: (item: T) => Promise<R[]>,
  label: (item: T) => string
): Promise<R[]> {
  const out: R[] = [];
  const failures: string[] = [];
  for (const item of items) {
    try {
      out.push(...(await fetchOne(item)));
    } catch (err) {
      const message = (err as Error).message;
      failures.push(label(item));
      console.error(`[${source}] Failed fetching ${label(item)}: ${message}`);
    }
  }
  if (items.length > 0 && failures.length === items.length) {
    throw new AdapterError(source, `Failed fetching all targets (${failures.join(", ")})`);
  }
  return out;
}

export function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ").toLowerCase();
}

export function normalizeCompany(company: string): string {
  return company.trim().replace(/\s+/g, " ").toLowerCase();
}
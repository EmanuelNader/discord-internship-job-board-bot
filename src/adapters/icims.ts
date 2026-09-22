import type { SourceAdapter, RawPosting } from "@/lib/types";
import { adapterConfigs } from "@/config/adapters.config";
import { fetchHtml, collectFromTargets } from "./base";
import * as cheerio from "cheerio";

const MAX_PAGES = 5;
const SEARCHES = ["intern", "co-op"];
const INTERN_TITLE = /\b(intern|internship|co[- ]?op|fellowship)\b/i;

/** Keep only US intern/co-op/fellowship titles; iCIMS keyword search also returns EITs. */
export function isIcimsInternTitle(title: string): boolean {
  return INTERN_TITLE.test(title);
}

/** Parse one iCIMS search HTML page into raw postings for a board. */
export function parseIcimsSearchHtml(html: string, company: string, host: string): RawPosting[] {
  const $ = cheerio.load(html);
  const postings: RawPosting[] = [];

  $("li.iCIMS_JobCardItem, .iCIMS_JobCardItem").each((_, el) => {
    const $el = $(el);
    const $a = $el.find("a.iCIMS_Anchor[href*=\"/jobs/\"]").first();
    const href = $a.attr("href");
    if (!href) return;

    const title =
      $a.find("h3").first().text().replace(/\s+/g, " ").trim() ||
      ($a.attr("title") ?? "").replace(/^\d+\s*-\s*/, "").replace(/\s+/g, " ").trim();
    if (!title || !isIcimsInternTitle(title)) return;

    const match = href.match(/\/jobs\/(\d+)\//);
    if (!match) return;
    const externalId = match[1];

    const location =
      $el
        .find(".header.left span")
        .filter((_, span) => !$(span).hasClass("sr-only") && !$(span).hasClass("field-label"))
        .first()
        .text()
        .replace(/\s+/g, " ")
        .trim() || null;

    const url = new URL(href, `https://${host}`).origin + new URL(href, `https://${host}`).pathname;

    postings.push({
      title,
      company,
      location,
      url,
      externalId,
      raw: { host, href },
    });
  });

  return postings;
}

export function createIcimsAdapter(): SourceAdapter {
  const config = adapterConfigs.find((c) => c.name === "icims");
  if (!config) throw new Error("iCIMS config not found");
  const boards = config.icimsBoards ?? [];

  return {
    name: "icims",
    pollIntervalSec: config.pollIntervalSec,
    async fetchNewPostings(): Promise<RawPosting[]> {
      return collectFromTargets(
        "icims",
        boards,
        async (board) => {
          const byId = new Map<string, RawPosting>();

          for (const searchText of SEARCHES) {
            for (let page = 0; page < MAX_PAGES; page++) {
              const url =
                `https://${board.host}/jobs/search?ss=1&searchKeyword=${encodeURIComponent(searchText)}` +
                `&in_iframe=1&pr=${page}`;
              const html = await fetchHtml(url);
              const parsed = parseIcimsSearchHtml(html, board.name, board.host);
              if (parsed.length === 0) break;
              let added = 0;
              for (const posting of parsed) {
                if (posting.externalId && !byId.has(posting.externalId)) {
                  byId.set(posting.externalId, posting);
                  added++;
                }
              }
              if (added === 0) break;
            }
          }

          return [...byId.values()];
        },
        (board) => board.name
      );
    },
  };
}

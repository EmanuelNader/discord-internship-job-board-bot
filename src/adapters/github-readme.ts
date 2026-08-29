import * as cheerio from "cheerio";

export interface ParsedListing {
  company: string;
  title: string;
  location: string | null;
  url: string;
  ageDays: number | null;
  closed: boolean;
}

const CLOSED_MARK = /🔒|🚫|\bclosed\b/i;
const CONTINUATION = /^(↳|→)$/;
const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

export function parsePostedAgeDays(text: string, now = new Date()): number | null {
  const t = text.trim();
  if (!t) return null;

  const dayMatch = t.match(/^(\d+)\s*d\b/i);
  if (dayMatch) return Number(dayMatch[1]);
  const weekMatch = t.match(/^(\d+)\s*w\b/i);
  if (weekMatch) return Number(weekMatch[1]) * 7;
  const monthMatch = t.match(/^(\d+)\s*mo\b/i);
  if (monthMatch) return Number(monthMatch[1]) * 30;

  const dateMatch = t.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})(?:,?\s*(\d{4}))?/i);
  if (dateMatch) {
    const month = MONTHS[dateMatch[1].slice(0, 3).toLowerCase()];
    const day = Number(dateMatch[2]);
    let year = dateMatch[3] ? Number(dateMatch[3]) : now.getUTCFullYear();
    const parsed = new Date(Date.UTC(year, month, day));
    if (!dateMatch[3] && parsed.getTime() > now.getTime()) {
      parsed.setUTCFullYear(year - 1);
    }
    const diff = Math.floor((now.getTime() - parsed.getTime()) / 86400000);
    return diff < 0 ? 0 : diff;
  }

  return null;
}

function isSkippableHref(href: string): boolean {
  return (
    !href ||
    href.startsWith("#") ||
    href.includes("i.imgur.com") ||
    href.includes("imgur.com") ||
    /simplify\.jobs\/c\//i.test(href)
  );
}

function firstApplyUrl(html: string): string | null {
  const $ = cheerio.load(`<div>${html}</div>`);
  const hrefs: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href")?.trim();
    if (href && !isSkippableHref(href)) hrefs.push(href);
  });
  return hrefs[0] ?? null;
}

function cleanCellText(htmlOrText: string): string {
  const $ = cheerio.load(`<div>${htmlOrText}</div>`);
  return $("div").text().replace(/\s+/g, " ").trim();
}

function headerIndex(headers: string[], ...names: string[]): number {
  const lower = headers.map((h) => h.toLowerCase());
  for (const name of names) {
    const i = lower.findIndex((h) => h.includes(name));
    if (i >= 0) return i;
  }
  return -1;
}

function mapRow(
  cells: string[],
  headers: string[],
  lastCompany: string
): ParsedListing | null {
  const companyIdx = headerIndex(headers, "company");
  const roleIdx = headerIndex(headers, "role", "position");
  const locIdx = headerIndex(headers, "location");
  const applyIdx = headerIndex(headers, "application", "link", "posting");
  const ageIdx = headerIndex(headers, "age", "date posted", "posted");
  if (companyIdx < 0 || roleIdx < 0) return null;

  const companyRaw = cleanCellText(cells[companyIdx] ?? "");
  const title = cleanCellText(cells[roleIdx] ?? "");
  if (!title) return null;

  const company = CONTINUATION.test(companyRaw) || !companyRaw ? lastCompany : companyRaw;
  if (!company) return null;

  const applyHtml = cells[applyIdx] ?? cells[cells.length - 2] ?? "";
  const applyText = cleanCellText(applyHtml);
  const closed = CLOSED_MARK.test(applyHtml) || CLOSED_MARK.test(title) || CLOSED_MARK.test(applyText);
  const url = firstApplyUrl(applyHtml);
  if (!url) return null;

  const locationRaw = locIdx >= 0 ? cleanCellText(cells[locIdx] ?? "") : "";
  const ageText = ageIdx >= 0 ? cleanCellText(cells[ageIdx] ?? "") : "";

  return {
    company,
    title,
    location: locationRaw || null,
    url,
    ageDays: parsePostedAgeDays(ageText),
    closed,
  };
}

function tableHeaders($: cheerio.CheerioAPI, $table: cheerio.Cheerio<any>): string[] {
  const headers: string[] = [];
  const $ths = $table.find("thead th").length
    ? $table.find("thead th")
    : $table.find("tr").first().find("th");
  $ths.each((_, th) => {
    headers.push($(th).text().trim());
  });
  return headers;
}

function parseHtmlTables(content: string): ParsedListing[] {
  const $ = cheerio.load(content);
  const listings: ParsedListing[] = [];
  $("table").each((_, table) => {
    const $table = $(table);
    const headers = tableHeaders($, $table);
    if (headerIndex(headers, "company") < 0 || headerIndex(headers, "role", "position") < 0) return;

    const $rows = $table.find("tbody tr").length
      ? $table.find("tbody tr")
      : $table.find("tr").slice($table.find("thead").length ? 0 : 1);

    let lastCompany = "";
    $rows.each((__, tr) => {
      const cells: string[] = [];
      $(tr)
        .find("td")
        .each((___, td) => {
          cells.push($(td).html() ?? "");
        });
      if (cells.length === 0) return;
      const parsed = mapRow(cells, headers, lastCompany);
      if (parsed) {
        lastCompany = parsed.company;
        listings.push(parsed);
      }
    });
  });
  return listings;
}

function splitMarkdownRow(line: string): string[] {
  let row = line.trim();
  if (row.startsWith("|")) row = row.slice(1);
  if (row.endsWith("|")) row = row.slice(0, -1);
  return row.split("|").map((c) => c.trim());
}

function parseMarkdownTables(content: string): ParsedListing[] {
  const listings: ParsedListing[] = [];
  const lines = content.split("\n");
  let headers: string[] | null = null;
  let lastCompany = "";

  for (const line of lines) {
    if (!line.includes("|")) {
      headers = null;
      lastCompany = "";
      continue;
    }
    const cells = splitMarkdownRow(line);
    if (cells.every((c) => /^[-:]+$/.test(c))) continue;
    if (headerIndex(cells, "company") >= 0 && headerIndex(cells, "role", "position") >= 0) {
      headers = cells;
      lastCompany = "";
      continue;
    }
    if (!headers) continue;
    const parsed = mapRow(cells, headers, lastCompany);
    if (parsed) {
      lastCompany = parsed.company;
      listings.push(parsed);
    }
  }
  return listings;
}

export function parseInternshipListings(content: string): ParsedListing[] {
  const html = parseHtmlTables(content);
  if (htmlRowsHaveJobs(html)) return html;
  return parseMarkdownTables(content);
}

function htmlRowsHaveJobs(rows: ParsedListing[]): boolean {
  return rows.length > 0;
}

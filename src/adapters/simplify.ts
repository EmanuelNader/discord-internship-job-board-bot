import type { SourceAdapter, RawPosting } from "@/lib/types";
import { adapterConfigs } from "@/config/adapters.config";
import { fetchHtml, collectFromTargets } from "./base";
import * as cheerio from "cheerio";

export function createSimplifyAdapter(companiesOverride?: string[]): SourceAdapter {
  const config = adapterConfigs.find((c) => c.name === "simplify");
  if (!config) throw new Error("Simplify config not found");

  const companies = companiesOverride ?? config.companies;

  return {
    name: "simplify",
    pollIntervalSec: config.pollIntervalSec,
    async fetchNewPostings(): Promise<RawPosting[]> {
      return collectFromTargets(
        "simplify",
        companies,
        async (company) => {
          const html = await fetchHtml(`https://simplify.jobs/companies/${company}`);
          const $ = cheerio.load(html);
          const postings: RawPosting[] = [];
          $(".job-link").each((_, el) => {
            const $el = $(el);
            const title = $el.find("h3").text().trim();
            const location = $el.find(".location").text().trim() || null;
            const href = $el.attr("href");
            if (title && href) {
              const externalId = `${company}-${href.split("/").pop()}`;
              postings.push({
                title,
                company: company.charAt(0).toUpperCase() + company.slice(1),
                location,
                url: `https://simplify.jobs${href}`,
                externalId,
                raw: { html: $el.html() },
              });
            }
          });
          return postings;
        },
        (company) => company
      );
    },
  };
}

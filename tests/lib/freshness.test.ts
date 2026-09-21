import { describe, it, expect } from "vitest";
import { isPostedOnOrAfter, sortNewestFirst, startOfUtcDay, utcDaysAgo } from "@/lib/freshness";

describe("startOfUtcDay", () => {
  it("strips time to UTC midnight", () => {
    expect(startOfUtcDay(new Date("2026-09-02T18:41:00Z")).toISOString()).toBe(
      "2026-09-02T00:00:00.000Z"
    );
  });
});

describe("utcDaysAgo", () => {
  it("moves back whole UTC days", () => {
    expect(utcDaysAgo(new Date("2026-09-17T18:41:00Z"), 7).toISOString()).toBe(
      "2026-09-10T00:00:00.000Z"
    );
  });
});

describe("isPostedOnOrAfter", () => {
  const onboardDay = new Date("2026-09-02T18:00:00Z");

  it("keeps a job posted on onboard day", () => {
    expect(isPostedOnOrAfter(new Date("2026-09-02T14:00:00Z"), onboardDay)).toBe(true);
  });

  it("drops a job posted before onboard day", () => {
    expect(isPostedOnOrAfter(new Date("2026-04-16T00:00:00Z"), onboardDay)).toBe(false);
  });

  it("drops a job with no published date", () => {
    expect(isPostedOnOrAfter(null, onboardDay)).toBe(false);
  });
});

describe("sortNewestFirst", () => {
  it("orders by publishedAt descending and keeps undated last", () => {
    const sorted = sortNewestFirst([
      { id: "old", publishedAt: "2026-09-10T00:00:00Z" },
      { id: "none", publishedAt: null },
      { id: "new", publishedAt: "2026-09-20T12:00:00Z" },
      { id: "mid", publishedAt: "2026-09-15T00:00:00Z" },
    ]);
    expect(sorted.map((item) => item.id)).toEqual(["new", "mid", "old", "none"]);
  });
});

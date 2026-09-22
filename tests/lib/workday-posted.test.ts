import { describe, it, expect } from "vitest";
import { parseWorkdayPostedOn, workdayPostedAt } from "@/lib/workday-posted";

describe("parseWorkdayPostedOn", () => {
  const now = new Date("2026-09-21T18:00:00Z");

  it("parses Posted Today", () => {
    expect(parseWorkdayPostedOn("Posted Today", now)?.toISOString()).toBe("2026-09-21T00:00:00.000Z");
  });

  it("parses Posted N Days Ago", () => {
    expect(parseWorkdayPostedOn("Posted 6 Days Ago", now)?.toISOString()).toBe("2026-09-15T00:00:00.000Z");
    expect(parseWorkdayPostedOn("Posted 5 Days Ago", now)?.toISOString()).toBe("2026-09-16T00:00:00.000Z");
  });

  it("parses Posted 30+ Days Ago as 30 days", () => {
    expect(parseWorkdayPostedOn("Posted 30+ Days Ago", now)?.toISOString()).toBe("2026-08-22T00:00:00.000Z");
  });

  it("parses an ISO date", () => {
    expect(parseWorkdayPostedOn("2026-09-18", now)?.toISOString()).toMatch(/^2026-09-18/);
  });

  it("returns null for empty values", () => {
    expect(parseWorkdayPostedOn(null, now)).toBeNull();
    expect(parseWorkdayPostedOn("unknown", now)).toBeNull();
  });
});

describe("workdayPostedAt", () => {
  it("prefers postedOn relative text", () => {
    const now = new Date("2026-09-21T18:00:00Z");
    expect(workdayPostedAt({ postedOn: "Posted Today" }, now)).toBe("2026-09-21T00:00:00.000Z");
  });
});

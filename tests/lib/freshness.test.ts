import { describe, it, expect } from "vitest";
import { isPostedOnOrAfter, startOfUtcDay } from "@/lib/freshness";

describe("startOfUtcDay", () => {
  it("strips time to UTC midnight", () => {
    expect(startOfUtcDay(new Date("2026-09-02T18:41:00Z")).toISOString()).toBe(
      "2026-09-02T00:00:00.000Z"
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

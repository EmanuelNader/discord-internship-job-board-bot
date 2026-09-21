import { describe, it, expect } from "vitest";
import {
  filterEnabledRoleFamilies,
  getEnabledRoleFamilies,
  roleFamilies,
} from "@/config/roles.config";

describe("roleFamilies", () => {
  it("replaces the single engineering family with five club tracks", () => {
    const families = roleFamilies.map((f) => f.family);
    expect(families).not.toContain("engineering");
    expect(families).toEqual(expect.arrayContaining([
      "swe",
      "pm-program",
      "hardware",
      "data",
      "ml",
      "civil-structural",
      "mechanical",
      "electrical",
      "chemical",
      "aerospace",
      "other",
    ]));
    expect(families).not.toContain("design");
    expect(families).not.toContain("growth");
  });

  it("maps club tracks to their channels and ping roles", () => {
    const byFamily = Object.fromEntries(roleFamilies.map((f) => [f.family, f]));
    expect(byFamily["civil-structural"]).toMatchObject({
      channelName: "civil-structural-jobs",
      roleName: "Civil/Structural",
      enabled: true,
    });
    expect(byFamily.mechanical).toMatchObject({
      channelName: "mechanical-jobs",
      roleName: "Mechanical",
      enabled: true,
    });
    expect(byFamily.electrical).toMatchObject({
      channelName: "electrical-jobs",
      roleName: "Electrical",
      enabled: true,
    });
    expect(byFamily.chemical).toMatchObject({
      channelName: "chemical-jobs",
      roleName: "Chemical",
      enabled: true,
    });
    expect(byFamily.aerospace).toMatchObject({
      channelName: "aerospace-jobs",
      roleName: "Aerospace",
      enabled: true,
    });
    expect(byFamily.other).toMatchObject({
      channelName: "other-jobs",
      roleName: "Other",
      enabled: true,
    });
  });

  it("enables every current family including the five club tracks", () => {
    expect(roleFamilies.every((f) => f.enabled)).toBe(true);
    expect(getEnabledRoleFamilies()).toEqual(roleFamilies);
  });

  it("keeps unique channel names, emojis, and ping role names", () => {
    const channels = roleFamilies.map((f) => f.channelName);
    const emojis = roleFamilies.map((f) => f.emoji);
    const roles = roleFamilies.map((f) => f.roleName);
    expect(new Set(channels).size).toBe(channels.length);
    expect(new Set(emojis).size).toBe(emojis.length);
    expect(new Set(roles).size).toBe(roles.length);
  });

  it("keeps civil and structural titles on the same family", () => {
    const family = roleFamilies.find((f) => f.family === "civil-structural");
    expect(family?.titles.map((t) => t.title)).toEqual(["eng-structural", "eng-civil"]);
  });
});

describe("filterEnabledRoleFamilies", () => {
  it("drops families that are not enabled", () => {
    expect(filterEnabledRoleFamilies(["swe", "engineering", "electrical"])).toEqual([
      "swe",
      "electrical",
    ]);
  });

  it("returns empty when every match is disabled", () => {
    expect(filterEnabledRoleFamilies(["engineering"])).toEqual([]);
  });
});

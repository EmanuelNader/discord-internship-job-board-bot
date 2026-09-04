import { describe, it, expect } from "vitest";
import { buildPostingEmbed } from "@/poster/embed";

describe("buildPostingEmbed", () => {
  it("builds embed with all fields", () => {
    const embed = buildPostingEmbed({
      title: "Software Engineer Intern",
      company: "Google",
      location: "Mountain View, CA",
      url: "https://careers.google.com/jobs/123",
      level: "internship",
      sourceName: "greenhouse",
      roleFamily: ["swe"],
      roleTitles: ["swe-frontend"],
      postedAt: new Date(Date.UTC(2024, 0, 15)), // Jan 15, 2024 UTC
    });

    expect(embed.data.title).toBe("Software Engineer Intern");
    expect(embed.data.url).toBe("https://careers.google.com/jobs/123");
    expect(embed.data.color).toBe(0x00ff00);
    expect(embed.data.fields![0].name).toBe("Company");
    expect(embed.data.fields![0].value).toBe("Google");
    expect(embed.data.fields![3].name).toBe("Source");
    expect(embed.data.fields![4].name).toBe("Roles");
    expect(embed.data.fields![5].name).toBe("Posted");
    expect(embed.data.fields![5].value).toBe("Jan 15, 2024");
  });

  it("handles missing location", () => {
    const embed = buildPostingEmbed({
      title: "Intern",
      company: "Acme",
      location: null,
      url: "https://a.com",
      level: "co-op",
      sourceName: "lever",
      roleFamily: ["swe"],
      roleTitles: [],
      postedAt: new Date(Date.UTC(2024, 1, 20)), // Feb 20, 2024 UTC
    });

    expect(embed.data.title).toBe("Intern");
    expect(embed.data.fields![1].value).toBe("Unspecified"); // Location field
    expect(embed.data.fields![4].value).toBe("Feb 20, 2024");
  });

  it("shows unknown when the listing date is missing", () => {
    const embed = buildPostingEmbed({
      title: "Intern",
      company: "Acme",
      location: "SF",
      url: "https://a.com",
      level: "internship",
      sourceName: "github",
      roleFamily: ["swe"],
      roleTitles: [],
    });

    const posted = embed.data.fields!.find((f) => f.name === "Posted");
    expect(posted?.value).toBe("unknown");
  });

  it("assigns color by level", () => {
    const intern = buildPostingEmbed({ title: "I", company: "A", url: "https://a.com", level: "internship", sourceName: "gh", roleFamily: ["swe"], roleTitles: [], location: null, postedAt: new Date() });
    const coop = buildPostingEmbed({ title: "I", company: "A", url: "https://a.com", level: "co-op", sourceName: "gh", roleFamily: ["swe"], roleTitles: [], location: null, postedAt: new Date() });
    const fellow = buildPostingEmbed({ title: "I", company: "A", url: "https://a.com", level: "fellowship", sourceName: "gh", roleFamily: ["swe"], roleTitles: [], location: null, postedAt: new Date() });

    expect(intern.data.color).toBe(0x00ff00);
    expect(coop.data.color).toBe(0x3498db);
    expect(fellow.data.color).toBe(0x9b59b6);
  });
});

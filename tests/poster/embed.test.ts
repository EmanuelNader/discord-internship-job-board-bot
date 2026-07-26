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
    });

    expect(embed.data.title).toBe("Software Engineer Intern");
    expect(embed.data.url).toBe("https://careers.google.com/jobs/123");
    expect(embed.data.color).toBe(0x00ff00);
    expect(embed.data.fields).toHaveLength(5);
    expect(embed.data.fields![0].name).toBe("Company");
    expect(embed.data.fields![0].value).toBe("Google");
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
    });

    expect(embed.data.fields![1].value).toBe("Unspecified");
  });

  it("assigns color by level", () => {
    const intern = buildPostingEmbed({ title: "I", company: "A", url: "https://a.com", level: "internship", sourceName: "gh", roleFamily: ["swe"], roleTitles: [], location: null });
    const coop = buildPostingEmbed({ title: "I", company: "A", url: "https://a.com", level: "co-op", sourceName: "gh", roleFamily: ["swe"], roleTitles: [], location: null });
    const fellow = buildPostingEmbed({ title: "I", company: "A", url: "https://a.com", level: "fellowship", sourceName: "gh", roleFamily: ["swe"], roleTitles: [], location: null });

    expect(intern.data.color).toBe(0x00ff00);
    expect(coop.data.color).toBe(0x3498db);
    expect(fellow.data.color).toBe(0x9b59b6);
  });
});

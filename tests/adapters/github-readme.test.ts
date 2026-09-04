import { describe, it, expect } from "vitest";
import { parseInternshipListings, parsePostedAgeDays, parsePostedDate } from "@/adapters/github-readme";

const SIMPLIFY_HTML = `
<table>
<thead>
<tr>
<th>Company</th>
<th>Role</th>
<th>Location</th>
<th>Application</th>
<th>Age</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong><a href="https://simplify.jobs/c/Northwood-Space">Northwood Space</a></strong></td>
<td>Software Engineer Intern - Multiple Teams</td>
<td>LA<br>Torrance, CA</td>
<td><div align="center"><a href="https://jobs.ashbyhq.com/NorthwoodSpace/ce3d4b73/application"><img src="https://i.imgur.com/fbjwDvo.png" alt="Apply"></a> <a href="https://simplify.jobs/p/b887b47d"><img src="https://i.imgur.com/aVnQdox.png" alt="Simplify"></a></div></td>
<td>0d</td>
</tr>
<tr>
<td>↳</td>
<td>Firmware Engineer Intern</td>
<td>Torrance, CA</td>
<td><div align="center"><a href="https://jobs.ashbyhq.com/NorthwoodSpace/firmware-intern"><img src="https://i.imgur.com/fbjwDvo.png" alt="Apply"></a></div></td>
<td>1d</td>
</tr>
<tr>
<td><strong><a href="https://simplify.jobs/c/ClosedCo">Closed Co</a></strong></td>
<td>Software Engineer Intern</td>
<td>Remote</td>
<td><div align="center">🔒 <a href="https://jobs.ashbyhq.com/closed/old"><img src="https://i.imgur.com/fbjwDvo.png" alt="Apply"></a></div></td>
<td>2d</td>
</tr>
<tr>
<td><strong><a href="https://simplify.jobs/c/OldCo">Old Co</a></strong></td>
<td>Software Engineer Intern</td>
<td>NYC</td>
<td><div align="center"><a href="https://boards.greenhouse.io/oldco/jobs/1"><img src="https://i.imgur.com/fbjwDvo.png" alt="Apply"></a></div></td>
<td>90d</td>
</tr>
</tbody>
</table>
`;

const VANSH_MD = `
| Company | Role | Location | Application/Link | Date Posted |
| ------- | ---- | -------- | ---------------- | ----------- |
| Vertiv | Product Management Intern | Westerville, OH | <a href="https://example.com/jobs/vertiv-pm"><img src="https://i.imgur.com/u1KNU8z.png" alt="Apply"></a> | Aug 21 |
| ↳ | Product Management Intern, MBA | Delaware, OH | <a href="https://example.com/jobs/vertiv-mba"><img src="https://i.imgur.com/u1KNU8z.png" alt="Apply"></a> | Aug 21 |
`;

const SPEEDY_MD = `
| Company | Position | Location | Salary | Posting | Age |
|---|---|---|---|---|---|
| <a href="https://www.amazon.com"><strong>Amazon</strong></a> | Robotics Software Intern | Westboro, WI | $53/hr | <a href="https://www.amazon.jobs/jobs/10517149/apply"><img src="https://i.imgur.com/JpkfjIq.png" alt="Apply"/></a> | 1d |
`;

describe("parsePostedAgeDays", () => {
  const now = new Date("2026-08-29T12:00:00Z");

  it("parses day/week/month ages", () => {
    expect(parsePostedAgeDays("0d", now)).toBe(0);
    expect(parsePostedAgeDays("2d", now)).toBe(2);
    expect(parsePostedAgeDays("1w", now)).toBe(7);
    expect(parsePostedAgeDays("1mo", now)).toBe(30);
  });

  it("parses month-day dates and rolls future months to last year", () => {
    expect(parsePostedAgeDays("Aug 21", now)).toBe(8);
    expect(parsePostedAgeDays("Dec 1", new Date("2026-01-05T12:00:00Z"))).toBe(35);
  });

  it("parses numeric US dates as calendar days before now", () => {
    const later = new Date("2026-09-02T07:57:00Z");
    expect(parsePostedAgeDays("8/31/2026", later)).toBe(2);
    expect(parsePostedAgeDays("08/31/26", later)).toBe(2);
  });

  it("returns null when unparseable", () => {
    expect(parsePostedAgeDays("yesterday", now)).toBeNull();
  });
});

describe("parsePostedDate", () => {
  const now = new Date("2026-09-02T07:57:00Z");

  it("returns UTC midnight for numeric, ISO, and relative ages", () => {
    expect(parsePostedDate("8/31/2026", now)?.toISOString()).toBe("2026-08-31T00:00:00.000Z");
    expect(parsePostedDate("2026-08-31", now)?.toISOString()).toBe("2026-08-31T00:00:00.000Z");
    expect(parsePostedDate("2d", now)?.toISOString()).toBe("2026-08-31T00:00:00.000Z");
    expect(parsePostedDate("0d", now)?.toISOString()).toBe("2026-09-02T00:00:00.000Z");
    expect(parsePostedDate("Aug 31, 2026", now)?.toISOString()).toBe("2026-08-31T00:00:00.000Z");
  });
});

describe("parseInternshipListings", () => {
  it("parses SimplifyJobs HTML tables, inherits ↳, and marks closed rows", () => {
    const rows = parseInternshipListings(SIMPLIFY_HTML);
    expect(rows).toHaveLength(4);
    expect(rows[0]).toMatchObject({
      company: "Northwood Space",
      title: "Software Engineer Intern - Multiple Teams",
      url: "https://jobs.ashbyhq.com/NorthwoodSpace/ce3d4b73/application",
      ageDays: 0,
      closed: false,
    });
    expect(rows[1]).toMatchObject({
      company: "Northwood Space",
      title: "Firmware Engineer Intern",
      url: "https://jobs.ashbyhq.com/NorthwoodSpace/firmware-intern",
    });
    expect(rows[2].closed).toBe(true);
    expect(rows[3].ageDays).toBe(90);
  });

  it("parses vanshb03 markdown tables and inherits continuation rows", () => {
    const rows = parseInternshipListings(VANSH_MD);
    expect(rows).toHaveLength(2);
    expect(rows[0].company).toBe("Vertiv");
    expect(rows[0].url).toBe("https://example.com/jobs/vertiv-pm");
    expect(rows[1].company).toBe("Vertiv");
    expect(rows[1].title).toBe("Product Management Intern, MBA");
  });

  it("parses speedyapply markdown with Position/Posting columns", () => {
    const rows = parseInternshipListings(SPEEDY_MD);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      company: "Amazon",
      title: "Robotics Software Intern",
      url: "https://www.amazon.jobs/jobs/10517149/apply",
      ageDays: 1,
    });
  });
});

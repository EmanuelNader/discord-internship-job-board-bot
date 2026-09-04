import { describe, it, expect, beforeEach, afterEach } from "vitest";
import nock from "nock";
import { createGithubAdapter } from "@/adapters/github";
import { adapterConfigs } from "@/config/adapters.config";

const githubTargets = adapterConfigs.find((c) => c.name === "github")!.companies;

const EMPTY_MD = `| Company | Role | Location | Application/Link | Date Posted |
| --- | --- | --- | --- | --- |
`;

const SIMPLIFY_HTML = `
<table>
<thead><tr><th>Company</th><th>Role</th><th>Location</th><th>Application</th><th>Age</th></tr></thead>
<tbody>
<tr>
<td><strong><a href="https://simplify.jobs/c/Northwood-Space">Northwood Space</a></strong></td>
<td>Software Engineer Intern</td>
<td>Torrance, CA</td>
<td><a href="https://jobs.ashbyhq.com/NorthwoodSpace/abc/application"><img src="https://i.imgur.com/fbjwDvo.png"></a></td>
<td>0d</td>
</tr>
<tr>
<td><strong><a href="https://simplify.jobs/c/ClosedCo">Closed Co</a></strong></td>
<td>Software Engineer Intern</td>
<td>Remote</td>
<td>🔒 <a href="https://jobs.ashbyhq.com/closed/old"><img src="https://i.imgur.com/fbjwDvo.png"></a></td>
<td>1d</td>
</tr>
<tr>
<td><strong><a href="https://simplify.jobs/c/OldCo">Old Co</a></strong></td>
<td>Software Engineer Intern</td>
<td>NYC</td>
<td><a href="https://boards.greenhouse.io/oldco/jobs/1"><img src="https://i.imgur.com/fbjwDvo.png"></a></td>
<td>90d</td>
</tr>
</tbody>
</table>
`;

function parseTarget(entry: string): { owner: string; repo: string; path: string } {
  const hash = entry.indexOf("#");
  const repo = hash >= 0 ? entry.slice(0, hash) : entry;
  const path = hash >= 0 ? entry.slice(hash + 1) || "README.md" : "README.md";
  const [owner, repoName] = repo.split("/");
  return { owner, repo: repoName, path };
}

function nockContents(entry: string, body: string) {
  const { owner, repo, path } = parseTarget(entry);
  nock("https://api.github.com")
    .get(`/repos/${owner}/${repo}/contents/${path}`)
    .reply(200, body);
}

function nockEmptyTargets(except: string[] = []) {
  for (const entry of githubTargets) {
    if (except.includes(entry)) continue;
    nockContents(entry, EMPTY_MD);
  }
}

describe("GitHub Adapter", () => {
  const previousAge = process.env.GITHUB_MAX_AGE_DAYS;
  const adapter = createGithubAdapter();

  beforeEach(() => {
    nock.cleanAll();
    process.env.GITHUB_MAX_AGE_DAYS = "14";
  });

  afterEach(() => {
    if (previousAge === undefined) delete process.env.GITHUB_MAX_AGE_DAYS;
    else process.env.GITHUB_MAX_AGE_DAYS = previousAge;
  });

  it("parses README tables from Contents API and skips closed/stale rows", async () => {
    nockContents("SimplifyJobs/Summer2027-Internships", SIMPLIFY_HTML);
    nockEmptyTargets(["SimplifyJobs/Summer2027-Internships"]);

    const postings = await adapter.fetchNewPostings();
    expect(postings).toHaveLength(1);
    expect(postings[0]).toMatchObject({
      title: "Software Engineer Intern",
      company: "Northwood Space",
      url: "https://jobs.ashbyhq.com/NorthwoodSpace/abc/application",
    });
    expect(postings[0].externalId).toContain("SimplifyJobs/Summer2027-Internships#README.md");
    expect(postings[0].publishedAt).toMatch(/T00:00:00\.000Z$/);
  });

  it("uses calendar posted dates instead of first-seen", async () => {
    process.env.GITHUB_MAX_AGE_DAYS = "4000";
    nockContents(
      "vanshb03/Summer2027-Internships",
      `| Company | Role | Location | Application/Link | Date Posted |
| --- | --- | --- | --- | --- |
| HP IQ | Software Engineer Intern, Cloud Services | San Francisco, CA | <a href="https://example.com/hp-iq"><img src="https://i.imgur.com/u1KNU8z.png"></a> | 8/31/2026 |
`
    );
    nockEmptyTargets(["vanshb03/Summer2027-Internships"]);

    const postings = await adapter.fetchNewPostings();
    expect(postings).toHaveLength(1);
    expect(postings[0].publishedAt).toBe("2026-08-31T00:00:00.000Z");
  });

  it("parses markdown README listings from other listed repos", async () => {
    nockContents(
      "vanshb03/Summer2027-Internships",
      `| Company | Role | Location | Application/Link | Date Posted |
| --- | --- | --- | --- | --- |
| Vertiv | Product Management Intern | Westerville, OH | <a href="https://example.com/jobs/vertiv"><img src="https://i.imgur.com/u1KNU8z.png"></a> | 1d |
`
    );
    nockEmptyTargets(["vanshb03/Summer2027-Internships"]);

    const postings = await adapter.fetchNewPostings();
    expect(postings).toHaveLength(1);
    expect(postings[0].company).toBe("Vertiv");
    expect(postings[0].url).toBe("https://example.com/jobs/vertiv");
  });

  it("isolates a single repo failure", async () => {
    const { owner, repo, path } = parseTarget("SimplifyJobs/Summer2027-Internships");
    nock("https://api.github.com")
      .get(`/repos/${owner}/${repo}/contents/${path}`)
      .reply(500);
    nockEmptyTargets(["SimplifyJobs/Summer2027-Internships"]);

    const postings = await adapter.fetchNewPostings();
    expect(postings).toHaveLength(0);
  });

  it("throws AdapterError when every repo fails", async () => {
    for (const entry of githubTargets) {
      const { owner, repo, path } = parseTarget(entry);
      nock("https://api.github.com")
        .get(`/repos/${owner}/${repo}/contents/${path}`)
        .replyWithError("ECONNREFUSED");
    }

    await expect(adapter.fetchNewPostings()).rejects.toThrow(/github/i);
  });
});

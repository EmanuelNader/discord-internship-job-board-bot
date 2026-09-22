import { describe, it, expect, beforeEach } from "vitest";
import nock from "nock";
import { createIcimsAdapter, parseIcimsSearchHtml, isIcimsInternTitle } from "@/adapters/icims";
import { adapterConfigs } from "@/config/adapters.config";

const boards = adapterConfigs.find((c) => c.name === "icims")!.icimsBoards!;

const SAMPLE_HTML = `
<ul class="container-fluid iCIMS_JobsTable">
  <li class="iCIMS_JobCardItem">
    <div class="row">
      <div class="col-xs-6 header left">
        <span class="sr-only field-label">Job Locations</span>
        <span>US-CA-San Diego</span>
      </div>
      <div class="col-xs-12 title">
        <a href="https://careers-dewberry.icims.com/jobs/16396/site-civil-engineering-intern/job?in_iframe=1"
           class="iCIMS_Anchor" title="16396 - Site/Civil Engineering Intern">
          <h3>Site/Civil Engineering Intern</h3>
        </a>
      </div>
    </div>
  </li>
  <li class="iCIMS_JobCardItem">
    <div class="row">
      <div class="col-xs-6 header left">
        <span class="sr-only field-label">Job Locations</span>
        <span>US-TX-Austin</span>
      </div>
      <div class="col-xs-12 title">
        <a href="https://careers-dewberry.icims.com/jobs/26620/experienced-civil-engineer-in-training/job?in_iframe=1"
           class="iCIMS_Anchor" title="26620 - Experienced Civil Engineer in Training">
          <h3>Experienced Civil Engineer in Training</h3>
        </a>
      </div>
    </div>
  </li>
</ul>
`;

function nockIcimsEmpty(exceptHost: string[] = []) {
  for (const board of boards) {
    if (exceptHost.includes(board.host)) continue;
    nock(`https://${board.host}`)
      .persist()
      .get(/\/jobs\/search/)
      .reply(200, "<html><body><ul class=\"iCIMS_JobsTable\"></ul></body></html>");
  }
}

describe("iCIMS adapter", () => {
  beforeEach(() => nock.cleanAll());

  it("keeps intern titles and drops EIT-only noise", () => {
    expect(isIcimsInternTitle("Civil Engineering Intern")).toBe(true);
    expect(isIcimsInternTitle("Mechanical Co-op")).toBe(true);
    expect(isIcimsInternTitle("Experienced Civil Engineer in Training")).toBe(false);
  });

  it("parses iCIMS search HTML and filters non-intern titles", () => {
    const postings = parseIcimsSearchHtml(SAMPLE_HTML, "Dewberry", "careers-dewberry.icims.com");
    expect(postings).toHaveLength(1);
    expect(postings[0]).toMatchObject({
      title: "Site/Civil Engineering Intern",
      company: "Dewberry",
      location: "US-CA-San Diego",
      externalId: "16396",
      url: "https://careers-dewberry.icims.com/jobs/16396/site-civil-engineering-intern/job",
    });
  });

  it("fetches intern postings from configured boards", async () => {
    const dewberry = boards.find((b) => b.name === "Dewberry")!;
    nock(`https://${dewberry.host}`)
      .persist()
      .get(/\/jobs\/search/)
      .query(true)
      .reply(200, SAMPLE_HTML);
    nockIcimsEmpty([dewberry.host]);

    const adapter = createIcimsAdapter();
    const postings = await adapter.fetchNewPostings();
    expect(postings).toHaveLength(1);
    expect(postings[0].company).toBe("Dewberry");
    expect(postings[0].externalId).toBe("16396");
  });

  it("isolates a single board failure", async () => {
    const dewberry = boards.find((b) => b.name === "Dewberry")!;
    nock(`https://${dewberry.host}`).get(/\/jobs\/search/).query(true).replyWithError("ECONNREFUSED");
    nockIcimsEmpty([dewberry.host]);

    const adapter = createIcimsAdapter();
    const postings = await adapter.fetchNewPostings();
    expect(postings).toHaveLength(0);
  });

  it("configures the eight non-tech boards", () => {
    expect(boards.map((b) => b.name)).toEqual(["Kimley-Horn", "Dewberry", "CEC", "KCI", "RS&H", "GFT", "Sargent & Lundy", "GD Mission Systems"]);
  });
});

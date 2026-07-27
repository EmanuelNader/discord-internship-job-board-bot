import { describe, it, expect, beforeEach } from "vitest";
import nock from "nock";
import { createAshbyAdapter } from "@/adapters/ashby";

describe("Ashby Adapter", () => {
  const adapter = createAshbyAdapter();

  beforeEach(() => nock.cleanAll());

  it("fetches jobs from Ashby API", async () => {
    const fixture = {
      jobs: [
        {
          id: "ashby_123",
          title: "Product Manager Intern",
          location: "San Francisco, CA",
          jobUrl: "https://jobs.ashbyhq.com/chalk/ashby_123",
          department: "Product",
        },
      ],
    };

    nock("https://jobs.ashbyhq.com")
      .get("/chalk")
      .reply(200, fixture);
    nock("https://jobs.ashbyhq.com")
      .get("/notion")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/ramp")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/snowflake")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/decagon")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/distyl")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/elevenlabs")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/flow-engineering")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/baseten")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/browserbase")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/base-power-company")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/clickup")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/apex-technology-inc")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/light")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/linear")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/sift")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/stack")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/gigaml")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/sesame")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/happyrobot")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/granola")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/sunday")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/openai")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/perplexity")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/pylon")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/cohere")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/traversal")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/harvey")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/sentry")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/braintrust")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/eliseai")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/resolve-ai")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/mintlify")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/roadrunner")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/supabase")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/wispr-flow")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/flint")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/cursor")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/modal-labs")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/langchain")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/cognition")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/paraform")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/judgment-labs")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/general-intelligence-company")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/saronic")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/plaid")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/exa")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/trajectory")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/krea")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/vizcom")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/posthog")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/poke")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/sierra")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/workweave")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/reducto")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/console")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/workoss")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/salient")
      .reply(200, { jobs: [] });

    const postings = await adapter.fetchNewPostings();
    expect(postings).toHaveLength(1);
    expect(postings[0]).toMatchObject({
      title: "Product Manager Intern",
      company: "Chalk",
      externalId: "ashby_123",
      url: "https://jobs.ashbyhq.com/chalk/ashby_123",
    });
  });

  it("throws AdapterError on network failure", async () => {
    nock("https://jobs.ashbyhq.com")
      .get("/chalk")
      .replyWithError("ECONNREFUSED");
    nock("https://jobs.ashbyhq.com")
      .get("/notion")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/ramp")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/snowflake")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/decagon")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/distyl")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/elevenlabs")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/flow-engineering")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/baseten")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/browserbase")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/base-power-company")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/clickup")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/apex-technology-inc")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/light")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/linear")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/sift")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/stack")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/gigaml")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/sesame")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/happyrobot")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/granola")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/sunday")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/openai")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/perplexity")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/pylon")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/cohere")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/traversal")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/harvey")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/sentry")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/braintrust")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/eliseai")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/resolve-ai")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/mintlify")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/roadrunner")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/supabase")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/wispr-flow")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/flint")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/cursor")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/modal-labs")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/langchain")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/cognition")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/paraform")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/judgment-labs")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/general-intelligence-company")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/saronic")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/plaid")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/exa")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/trajectory")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/krea")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/vizcom")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/posthog")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/poke")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/sierra")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/workweave")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/reducto")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/console")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/workoss")
      .reply(200, { jobs: [] });
    nock("https://jobs.ashbyhq.com")
      .get("/salient")
      .reply(200, { jobs: [] });

    await expect(adapter.fetchNewPostings()).rejects.toThrow(/ashby/i);
  });
});

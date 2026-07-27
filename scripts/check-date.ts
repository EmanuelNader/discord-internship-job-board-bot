import { fetchJson } from "@/adapters/base";
const data = await fetchJson<any>("https://boards-api.greenhouse.io/v1/boards/stripe/jobs?content=Job");
const job = data.jobs[0];
console.log(JSON.stringify(job, null, 2));

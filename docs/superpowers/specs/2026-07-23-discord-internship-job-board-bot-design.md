# Discord Internship Job-Board Bot — Design Spec

**Date:** 2026-07-23
**Status:** Draft (brainstorming complete, pending implementation plan)
**Author:** Collaborative brainstorming session

---

## 1. Purpose

A Discord bot that scrapes internship/co-op/fellowship job postings from a defined set of sources, deduplicates them, and posts each new posting to per-role-family Discord channels with per-role-title pings. Users self-assign exactly the ping roles they want; everything else posts silently in the channel.

**Strict scope:** postings that require you to be a **current college student** to apply — internships, co-ops, fellowships only. New-grad / early-career / rotational / development programs are explicitly **out**.

---

## 2. Architecture Overview

A single long-running Node.js / discord.js process deployed to a small Linux VPS ($5/mo), managed by PM2 (auto-restart on crash, started on boot). Four isolated units communicating through one shared contract:

```
Source adapters  ->  Sources manager/scheduler  ->  SQLite (Prisma)  ->  Discord poster + channel router
```

- **Source adapters** — one per source. Each implements `fetchNewPostings(): Promise<RawPosting[]>`, returning raw payloads. Owns its own parsing/error handling; failures isolated and don't affect siblings.
- **Sources manager / scheduler** — runs each adapter on its own configurable interval (ATS: ~5 min; GitHub/Simplify: ~10–15 min). Hands raw payloads to the normalizer, computes `dedupHash`, upserts into DB, enqueues first-seen postings for posting.
- **DB (SQLite via Prisma)** — `Posting` table with unique constraint on `dedupHash`; `Source` table (health/last-run); `ChannelMap` table (`{ kind, roleFamily } -> channelId`). Config-driven, not hardcoded.
- **Discord poster + channel router** — pulls unseen postings; for each, looks up channel(s) via `ChannelMap` + `roleFamily[]`, sends one embed per matching channel with `allowedMentions` honored, pinging the matched per-title roles only. Marks posting as posted.
- **Discord command layer** — discord.js gateway (intents: `Guilds`, `GuildMessages`, `GuildMessageReactions`). Slash commands: `/ping`, `/role <titleRole>` (self-assign ping role), `/status` (source health + last-run + drop counters), `/linkchannel` (admin: bind channel), `/setup` (admin: idempotent provisioning of channels + roles from config).

### Isolation guarantees
Each unit depends only on the `Posting` contract + DB. A scraper crash cannot take down the Discord gateway; schema changes don't touch the Discord layer; one broken source can't stall the scheduler loop. Each unit is testable in isolation.

### `kind`-aware extensibility (for future phases)
The `Posting.kind` field is reserved. Phase 1 only emits `kind: "job"`. Future phases (direct-consideration events, hackathons, ambassador roles) require new source adapters + new `kind` values + new channel-map entries — **no schema migrations, no core changes** — purely additive.

---

## 3. The `Posting` Contract (shared boundary)

```ts
type PostingKind = "job"
  | "event"                  // future: direct-consideration events
  | "direct-consideration"   // future
  | "hackathon"              // future
  | "ambassador";            // future

type Level = "internship" | "co-op" | "fellowship";

interface Posting {
  dedupHash: string;          // sha256(`${sourceName}|${externalId}|${title}|${company}`); falls back to no-externalId variant
  externalId: string;        // ATS job-id, GH issue number; "" if unavailable
  sourceName: SourceName;     // "greenhouse" | "ashby" | "lever" | "workday" | "simplify" | "github"
  kind: PostingKind;          // "job" in v1
  level: Level;               // drives the filter outcome — non-matching postings are dropped
  title: string;             // normalized: trimmed, collapsed whitespace, single-case rule
  company: string;
  location: string | null;    // null = unspecified / remote-unknown
  roleFamily: RoleFamily[];   // one or more, drives channel routing
  roleTitles: RoleTitle[];    // per-title ping signals, drives ping roles
  url: string;               // canonical apply/apply-link URL
  firstSeenAt: Date;         // set by DB on insert, NEVER by adapter
  raw?: Record<string, unknown>;  // for debugging parser bugs; never surfaced to Discord users
}
```

**Design notes**
- `dedupHash` is the source of truth for "new vs seen." Computed **after** normalization so `"Software Engineer Intern "` and `"software engineer intern"` from the same company via the same ATS dedup to one row. Hash includes `externalId` when present (stable ATS job ids); falls back to `title|company` when absent.
- `roleFamily[]` is plural — drives the "post to all matching channels" routing (Section 6).
- `raw` round-trips unnormalized source payload for debugging; persisted but never shown to Discord. Invaluable when an adapter breaks.
- `firstSeenAt` is the only field adapters never set — the scheduler/DB stamps it on insert. Adapters stay stateless.

---

## 4. Internship Filter (strict scope)

Lives in `src/lib/normalize.ts` as the pure function `detectLevel(title, raw): Level | null`. Returning `null` drops the posting (it's never written to the DB).

### Include signals (posting passes when it matches any)
- **Internship** — `intern`, `internship`, `summer 2026`, `fall 2026`, `spring 2027`, etc.
- **Co-op** — `co-op`, `cooperative education`, `placement year`
- **Fellowship** — `fellowship`, `research fellowship`, `coding fellowship`, named student fellowships (XRDS-style)

### Hard drop (filter rejects)
- Title contains `senior`, `staff`, `principal`, `manager`, `manager of`, `head of`, `director`, `vp`, `lead` — **dropped unless** an include signal is also present on the same posting.
- Title contains **`new grad`, `new graduate`, `graduate program`, `early career`, `development program`, `rotational program`, `campus hire`, `entry level`, `campus to career`** — dropped, even when present. These are post-grad full-time roles requiring you to have finished college.
- ATS structured `experienceLevel="entry"` / `"early-career"` alone is **insufficient** — the posting still needs an internship/co-op/fellowship signal to pass. We do not promote "entry-level" to include on the strength of the ATS field alone.

### `/status` reports two drop buckets per source
- `dropped-non-intern` — full-time / senior / new-grad roles the filter rejected
- `dropped-unclassified` — postings the normalizer couldn't confidently bucket (rare; useful for tracking parser misses)

---

## 5. Role-Family Taxonomy + Per-Title Ping Roles

### Routing table

| Channel              | `roleFamily`   | Per-title ping roles within channel                                                                  |
|----------------------|----------------|------------------------------------------------------------------------------------------------------|
| `#swe-jobs`          | `swe`          | `@swe-frontend` `@swe-backend` `@swe-fullstack` `@swe-mobile` `@swe-devops` `@swe-embedded`           |
| `#pm-program-jobs`   | `pm-program`   | `@pm-product` `@pm-program` `@pm-tpm`                                                                 |
| `#hardware-jobs`     | `hardware`     | `@hw-silicon` `@hw-pcb` `@hw-fpga` `@hw-asic`                                                         |
| `#data-jobs`         | `data`         | `@data-scientist` `@data-engineer` `@data-analytics`                                                  |
| `#ml-ai-jobs`        | `ml`           | `@ml-engineer` `@ml-researcher` `@ml-ai-eng`                                                          |
| `#engineering-jobs`  | `engineering`  | `@eng-structural` `@eng-civil` `@eng-electrical` `@eng-mechanical` `@eng-chemical` `@eng-aerospace`   |
| `#design-jobs`       | `design`       | `@design-ux` `@design-ui` `@design-product` `@design-interaction`                                    |
| `#growth-jobs`       | `growth`       | `@growth-general` `@growth-lifecycle` `@growth-acquisition`                                          |

### Where the logic lives
`src/lib/normalize.ts` exports three pure functions — all independently unit-testable:
1. `detectLevel(title, raw): Level | null` — null = drop.
2. `detectRoleFamily(...): RoleFamily[]`
3. `detectRoleTitles(...): RoleTitle[]`

Adapters stay dumb: they only fetch + hand over `{ title, raw, ... }`. **All routing/filtering intelligence lives in one module**, which is the unit-testable boundary of the system. Adding a role = one table edit in this file; no scraper changes.

### User-facing flow
- A "Software Engineer Intern - Frontend" posting -> `level: internship`, `roleFamily: ["swe"]`, `roleTitles: ["frontend"]` -> routes to **only** `#swe-jobs`, pings **only** `@swe-frontend`. Adds nothing to other channels; does not ping `@swe-backend`.
- A "Full Stack Software Engineering Intern" -> `roleTitles: ["frontend", "backend"]` -> pings both `@swe-frontend` and `@swe-backend`.
- A "2026 SWE New Grad" posting -> `level: null` (drop) -> not posted anywhere, counted in `/status` `dropped-non-intern`.

### Role auto-provisioning
On first `ready`, the bot calls Discord's API to create any missing channels + role-family roles + per-title ping roles defined in `roles.config.ts` (idempotent — checked on every boot). Server setup = invite bot, run `/setup`, done.

---

## 6. Source Adapters (Phase 1)

Six adapters, each implementing the same interface:

```ts
interface SourceAdapter {
  name: SourceName;
  pollIntervalSec: number;
  fetchNewPostings(): Promise<RawPosting[]>;
}
```

### Phase 1 sources

| Source     | How it works                                                                                                        | Default poll interval |
|------------|---------------------------------------------------------------------------------------------------------------------|-----------------------|
| Greenhouse | Public boards expose `boards.greenhouse.io/<company>/embed/jobboard?content=Job&method=json` JSON. Walk pagination. | 300s (~5 min)         |
| Ashby      | Public boards expose a JSON jobs endpoint per tenant. Hosted job-board JSON.                                        | 300s (~5 min)         |
| Lever      | `jobs.lever.co/<company>` returns JSON; `POSTings` array.                                                            | 300s (~5 min)         |
| Workday    | HTML/JSON-scraped public career site; the `/wd1/.../jobs` endpoint returns paginated JSON.                          | 300s (~5 min)         |
| Simplify   | Public job-board pages per company; HTML parsing for posting list.                                                  | 900s (~15 min)        |
| GitHub     | Curated list of internship-job repos (e.g. Pitt CSC, summer2026internships). Walk issues, dedup per issue number.   | 900s (~15 min)        |

### Adapter responsibilities
- Fetch from source (HTTP for ATS/Jobs; GitHub REST API for repos).
- Pull out raw fields (title, company, location, url, externalId, raw payload).
- **Do not normalize** — hand raw payload to `normalize.ts`. Adapters stay source-shape, the normalizer stays source-agnostic.
- Surface a per-source error budget — failures logged to `Source.lastError`, surfaced in `/status`. Never crash the scheduler loop; failures are swallowed and counted.

### Adding a source later = one new file in `src/adapters/<name>.ts`, one entry in `adapters.config.ts`. Nothing else changes.

---

## 7. DB Schema (SQLite via Prisma)

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")  // file:./dev.db
}

generator client {
  provider = "prisma-client-js"
}

model Posting {
  id          Int      @id @default(autoincrement())
  dedupHash   String   @unique
  externalId  String
  sourceName  String
  kind        String   @default("job")
  level       String
  title       String
  company     String
  location    String?
  roleFamily  String   // JSON array stored as text
  roleTitles  String   // JSON array stored as text
  url         String
  firstSeenAt DateTime @default(now())
  postedAt    DateTime?
  raw         String?  // JSON-serialized raw payload; null if not stored
  channelIds  String?  // JSON array of channel IDs we posted to

  @@index([sourceName])
  @@index([firstSeenAt])
  @@index([kind, roleFamily])
}

model Source {
  name              String   @id  // "greenhouse", "ashby", ...
  lastRunAt         DateTime?
  lastError         String?
  ingestedCount     Int      @default(0)
  droppedNonIntern  Int      @default(0)
  droppedUnclassified Int    @default(0)
  enabled           Boolean  @default(true)
  pollIntervalSec   Int      @default(300)
}

model ChannelMap {
  id         Int    @id @default(autoincrement())
  kind       String  // "job" in v1
  roleFamily String  // "swe", "pm-program", etc.
  channelId  String  // Discord channel snowflake

  @@unique([kind, roleFamily])
}
```

### Dedup behavior
- Scheduler computes `dedupHash`, calls `prisma.posting.upsert({ where: { dedupHash }, create: {...}, update: {} })`. The `update` branch = already-seen = do nothing (no Discord post). The `create` branch = first-seen = enqueue for posting.
- `postedAt` set after successful Discord send, so a posting can be retry-posted if the bot was temporarily offline.
- `channelIds` records where it was posted (multiple for cross-family postings).

### ChannelMap is config-driven, not hardcoded
Adding future `kind` values (events, hackathons, ambassador) only requires new rows in `ChannelMap` + new adapters. The poster/router already keys off `{ kind, roleFamily }` — no code changes.

---

## 8. Discord Poster + Channel Router + Commands

### Poster
Pulls `Posting` rows where `postedAt IS NULL`. For each:
1. Parse `roleFamily[]` from JSON column.
2. For each `roleFamily`, look up `ChannelMap` row by `kind + roleFamily` -> `channelId`.
3. Build embed: title (linked to apply URL), company, location, source, level badge, role-title tags.
4. Determine ping roles from `roleTitles[]`; pass to `allowedMentions` so only those roles get pinged.
5. `channel.send({ embeds: [embed], content: pingString || null, allowedMentions: { roles: pingRoleIds } })`.
6. Update `postedAt + channelIds` on the posting.

### Embed shape
```
**[POSTING_TITLE]**   <- link to apply URL
👔 **Company:** ...
📍 **Location:** ... / Remote / Unspecified
🧑‍💻 **Role:** per-title ping roles as text
🆎 **Level:** Internship / Co-op / Fellowship
📡 **Source:** greenhouse / ashby / lever / ...
```

### Commands (discord.js slash commands, REST `Routes.applicationCommands`)
- `/ping` — health check; replies latency + last source-sweep time.
- `/role <titleRole>` — self-assign a per-title ping role. Tab-autocomplete from `roles.config.ts`. Multiple args allowed.
- `/unrole <titleRole>` — remove a ping role.
- `/status` — source-by-source: last-run time, ingested, `dropped-non-intern`, `dropped-unclassified`, last error.
- `/linkchannel <kind> <roleFamily> <#channel>` — admin only. Writes a `ChannelMap` row.
- `/setup` — admin only. Idempotently creates missing channels + role-family roles + per-title ping roles from `roles.config.ts`.

### Gateway intents
`Guilds`, `GuildMessages`, `GuildMessageReactions` (the latter reserved for a future reaction-role board; not strictly required in v1).

---

## 9. Deployment & Operations

### Local development (Windows)
- Node.js + npm.
- SQLite file `dev.db` in repo (gitignored).
- A **second "dev" Discord bot token** for the test server — never touch the prod bot from the dev machine.
- `npm run dev` for hot-reload (tsx watch / nodemon).

### Production deployment
- Target: $5/mo Linux VPS (DigitalOcean / Hetzner / Linode / free Oracle Cloud ARM).
- Provision: SSH in, `git clone`, `npm ci`, `npx prisma migrate deploy`, `npm run build`.
- Process management: **PM2** — `pm2 start dist/bot.js --name intern-board`; `pm2 save && pm2 startup` for boot persistence and crash auto-restart.
- Secrets: `DISCORD_TOKEN`, `GITHUB_TOKEN` (for GitHub repos; avoids rate limits), `DATABASE_URL` — set via `.env` (gitignored) or PM2's env system.
- Logs: PM2's built-in log rotation; `pm2 logs intern-board`.

### Backfill
On first run in a new server, the bot can optionally backfill the most recent N postings per source (config flag `BACKFILL=true, BACKFILL_LIMIT=50`) so the channels aren't empty on launch. Backfilled postings are marked with `firstSeenAt` of when they were originally scraped (preserved in `raw` if available; else DB insert time).

---

## 10. Testing Strategy

### Unit tests (Vitest)
- `src/lib/normalize.ts` — the highest-value test surface. Table-driven tests over `detectLevel`, `detectRoleFamily`, `detectRoleTitles` against (a) the live taxonomy, (b) a corpus of real-world internship titles (collected during adapter development), (c) adversarial cases (senior roles mislabeled "internship", "Full Stack Engineer" with no level signal, etc.).
- `dedupHash` helper — fixed inputs/outputs across case + whitespace variations.
- Poster embed builder — given a `Posting`, produces the expected embed shape.

### Integration tests
- Each source adapter behind a recorded HTTP fixture (nock or similar). Replaying the fixture must produce the expected `RawPosting[]`. When a source changes its HTML/JSON shape, the test breaks first — we update the adapter, not the design.

### Manual smoke test
- In the dev server, run `/setup`, run one source with `BACKFILL=true BACKFILL_LIMIT=5`, confirm channel posts appear with correct pings, `/status` shows correct counters, run a second pass to confirm no duplicate postings (dedup working).

---

## 11. Out of Scope (Phase 2+)

Documented for future phases; **not built in Phase 1**:
- **Direct-consideration events** — `kind: "direct-consideration"` postings, new `#direct-consideration` channel, new adapters (e.g. specific fellowship pages).
- **Hackathons** — `kind: "hackathon"`, `#hackathons` channel, adapters for hackathon listings.
- **Ambassador roles** — `kind: "ambassador"`, `#ambassador-roles` channel, adapters from company ambassador program pages.
- **Per-user server-side filters** — DB-backed user preference store + matching engine for keyword/location filters beyond the per-title ping roles.
- **New-grad / early-career programs** — explicitly excluded from Phase 1; could be a separate `kind`/channel if added later.
- **Additional sources** — LinkedIn (ToS-hostile, login-walled), direct big-co career pages (Google / Apple / Microsoft, heavy JS and brittle), Reddit RSS, Hacker News "Who is hiring" monthly threads. All slot into the same adapter interface.

---

## 12. Open Decisions (deferred to implementation plan)

These will be settled when writing the implementation plan, not now:
- Exact curated list of GitHub internship repos to scrape.
- Exact curated list of companies to monitor per ATS (started hard-coded in `adapters.config.ts`, may later source from a public list).
- Whether to use `discord.js` Builders API for commands or raw REST JSON — both viable; Builders API is the modern recommendation.
- TypeScript vs plain JS — TypeScript for the `Posting` contract guarantees; recommended.
- Whether to include a one-message-every-N-seconds rate limit on the poster to avoid Discord rate limits during large backfills (likely yes).

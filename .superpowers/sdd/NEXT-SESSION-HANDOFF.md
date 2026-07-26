# Session Handoff — Plan 3 Complete, Merged to main

> **Branch state:** `plan/02-adapters` and `plan/03-poster` both deleted after merge.
> **Current branch:** `main` at commit `e7111b0`

---

## What's Done

### Plan 1 — scaffold + contract + normalize + DB (`main`)
- Project scaffold (ESM TypeScript, Vitest, Prisma, discord.js)
- `src/lib/types.ts` — `RawPosting`, `Posting`, `SourceAdapter`, all enums
- `src/lib/normalize.ts` — `detectLevel`, `detectRoleFamily`, `detectRoleTitles`, `dedupHash` (119 tests)
- `prisma/schema.prisma` — `Posting`, `Source`, `ChannelMap` models (SQLite)
- `src/config/` — `adapters.config.ts`, `roles.config.ts`
- `src/db/client.ts` — Prisma singleton

### Plan 2 — adapters + scheduler + backfill (`main`)
- `src/adapters/base.ts` — `fetchJson`, `fetchHtml`, `AdapterError`, normalize helpers
- `src/adapters/index.ts` — registry + factory for 6 adapters
- 6 adapters (each with nock fixture tests):
  - `greenhouse.ts` — `boards.greenhouse.io/{company}/embed/jobboard` JSON with pagination
  - `ashby.ts` — `jobs.ashbyhq.com/{company}` JSON
  - `lever.ts` — `api.lever.co/v0/postings/{company}?mode=json`
  - `workday.ts` — `{company}.wd1.myworkdayjobs.com/wd1/{company}/careers` POST with pagination
  - `simplify.ts` — Cheerio HTML scraper (`companies: []` in config for Phase 1)
  - `github.ts` — `api.github.com/repos/{owner}/{repo}/issues` + issue body parsing
- `src/scheduler/index.ts` — `SourcesManager` class with intervals, dedup upsert, health tracking
- `src/scheduler/backfill.ts` — insert-only backfill with `postedAt` set

### Plan 3 — poster + commands + provisioning + deploy (`main`)
- `src/index.ts` — Bot entry point: Client init, `ready` handler, SourcesManager wiring, backfill on first boot
- `src/poster/embed.ts` — `buildPostingEmbed()` pure function with level colors
- `src/poster/index.ts` — `Poster` class: ChannelMap lookup, role pings via `allowedMentions`, channel cache, `postedAt` update
- `src/provisioner/index.ts` — `ensureGuildSetup()`: idempotent channel + role + ChannelMap creation from config
- `src/commands/` — 6 slash commands:
  - `/ping` — latency check
  - `/role <titleRole>` — self-assign ping role
  - `/unrole <titleRole>` — remove ping role
  - `/status` — per-source health counters
  - `/linkchannel <family> <#channel>` — [Admin] bind channel to role family
  - `/setup` — [Admin] idempotent channel/role provisioning
- `src/commands/deploy.ts` — REST API command registration
- `src/commands/index.ts` — interaction dispatcher

### Validation
- **157 tests passing** (13 test files)
- **`tsc --noEmit` clean** — zero errors
- Review findings fixed: role pings, DISCORD_TOKEN guard, unknown cmd handler, dead imports, empty status, TextChannel type check, poster cache + error guard

---

## Next Up (Plan 4 Ideas — not spec'd)

1. **Deployment config** — PM2 `ecosystem.config.js`, `.env` template, build script, VPS setup docs
2. **Manual smoke test** — invite bot to server, run `/setup`, run `BACKFILL=true`, verify channels + posts + pings
3. **Reaction roles** — let users self-assign ping roles by reacting to a message
4. **Additional sources** — LinkedIn (ToS-permitting), Reddit RSS, company career pages
5. **New-grad / early-career support** — if scope expands, new `kind` + channels + adapters
6. **Per-user keyword/location filters** — server-side matching engine

---

## Key Files Reference

| File | Responsibility |
|------|---------------|
| `src/index.ts` | Bot boot: client, SourcesManager, provisioner, commands |
| `src/scheduler/index.ts` | Polling loop, dedup, health tracking |
| `src/poster/index.ts` | Discord send + channel routing + role pings |
| `src/commands/*.ts` | Slash command handlers |
| `src/provisioner/index.ts` | Idempotent channel/role creation |
| `src/config/roles.config.ts` | Role taxonomy (8 families, 26 titles) |
| `src/config/adapters.config.ts` | Source companies + poll intervals |
| `prisma/schema.prisma` | Posting, Source, ChannelMap models |

## Commands to Resume

```bash
# Run tests
npm test

# Type-check
npx tsc --noEmit

# Dev start (after setting .env)
npm run dev

# Generate Prisma migration after schema changes
npx prisma migrate dev --name <name>
```

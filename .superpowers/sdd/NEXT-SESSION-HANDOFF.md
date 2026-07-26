# Session Handoff — Plan 2 Complete

## State
- Branch: `plan/02-adapters` (commit `a43bb52`)
- **149 tests pass**, `tsc --noEmit` clean, 0 errors
- All 6 adapters + SourcesManager + backfill implemented

## Deliverables
| File | Status |
|------|--------|
| `src/adapters/base.ts` | fetchJson/fetchHtml, AdapterError, normalize fns |
| `src/adapters/index.ts` | Registry: createAdapter/getAllAdapters |
| `src/adapters/greenhouse.ts` | Greenhouse jobboard JSON API, pagination |
| `src/adapters/ashby.ts` | Ashby jobs API |
| `src/adapters/lever.ts` | Lever `api.lever.co/v0/postings` JSON |
| `src/adapters/workday.ts` | Workday POST API, pagination |
| `src/adapters/simplify.ts` | Cheerio HTML scraper; companies=[] for Phase 1 |
| `src/adapters/github.ts` | GitHub Issues REST API, issue body parsing |
| `src/scheduler/index.ts` | SourcesManager: intervals, dedup upsert, health tracking |
| `src/scheduler/backfill.ts` | Insert-only backfill with postedAt set |

## Next Branch: `plan/03-poster`
Tasks from the design spec:
1. **Discord poster** — embed builder per role family, channel routing via ChannelMap, rate limiting
2. **Slash commands** — `postings list`, `postings search`
3. **Channel provisioning** — auto-create channels per role family on startup
4. **Deployment** — PM2 config, env setup, first run with backfill

## Plan 2 Observations
- All adapters use `fetchJson` from `base.ts` (which wraps `node:https`/`node:http` directly, not global `fetch`) for nock compatibility
- Simplify adapter has `companies: []` in config — accepts optional `companiesOverride` for testing
- Workday adapter uses POST with JSON body — `fetchJson` signature extended to support method/body/headers
- SourcesManager requires `onNewPosting` callback (integrated by poster) and `onError` callback
- Backfill sets `postedAt: new Date()` so new-post detection skips backfilled records

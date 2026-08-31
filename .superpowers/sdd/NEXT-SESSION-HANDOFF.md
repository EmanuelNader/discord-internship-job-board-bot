# Session Handoff — Plan 4 Complete (awaiting manual smoke)

> **Current branch:** `plan/04-deploy` (pushed to `origin/plan/04-deploy`)
> **Code + docs for Plan 4 landed.** Manual Discord smoke remains operator-owned before merge to `main`.

---

## What's Done (Plan 4)

Plans 1–3 remain on `main`. Plan 4 hardens deploy/ops on `plan/04-deploy`:

| Task | Landing |
|------|---------|
| Env validation | `src/config/env.ts` + `dotenv/config` at boot — fail-fast on missing Discord/DB env |
| Production build | `tsc && tsc-alias` — path aliases resolved in `dist/` |
| Prisma migration | Baseline under `prisma/migrations/`; `npx prisma migrate deploy` for fresh DBs |
| Poster rate limit | Discord sends queued ~1 job / 2s |
| Backfill → Discord | Backfill leaves `postedAt` null and posts via Poster (not silent DB-only) |
| Graceful shutdown | SIGINT/SIGTERM stop scheduler + disconnect Prisma |
| PM2 | `ecosystem.config.cjs` (`intern-board` → `dist/index.js`) |
| Deploy runbook | `docs/DEPLOY.md` — local/VPS + **First-boot Discord smoke** checklist |

Plans 1–3 deliverables (adapters, scheduler, poster, commands, provisioner) unchanged in scope.

---

## Smoke Checklist

Use **[docs/DEPLOY.md](../../docs/DEPLOY.md)** — section **First-boot Discord smoke** (and Task 9 checklist in the plan if needed).

Operator-owned; not claimed done in this handoff.

---

## Next Up (after merge)

1. **Manual smoke on a dev Discord guild** (see `docs/DEPLOY.md`)
2. **Merge `plan/04-deploy` → `main`** after review + smoke (or merge then smoke on staging — operator choice)
3. **Optional ops:** enable ashby / lever / workday in adapter config after smoke looks good
4. **Later (out of Plan 4):** reaction roles; keyword filters; new-grad channels — not in this plan

---

## Key Files Reference

| File | Responsibility |
|------|----------------|
| `docs/DEPLOY.md` | VPS/local runbook + Discord smoke checklist |
| `ecosystem.config.cjs` | PM2 process (`intern-board`) |
| `src/config/env.ts` | Required/optional env parsing + fail-fast |
| `src/index.ts` | Boot: dotenv, validateEnv, backfill→poster, SIGINT/SIGTERM |
| `src/poster/index.ts` | Rate-limited Discord send queue |
| `src/scheduler/backfill.ts` | Seed postings with `postedAt` null; invoke poster path |
| `prisma/migrations/` | Baseline for `prisma migrate deploy` |
| `.env.example` | Env template (`BACKFILL*`, `NODE_ENV`, tokens) |
| `src/scheduler/index.ts` | Polling loop, dedup, health |
| `src/commands/*.ts` | Slash commands |
| `src/provisioner/index.ts` | Idempotent channel/role + ChannelMap setup |
| `src/config/adapters.config.ts` | Source companies + poll intervals |
| `src/config/roles.config.ts` | Role taxonomy |

## Commands to Resume

```bash
git checkout plan/04-deploy
git pull

# Automated verify
npm ci
npx prisma migrate deploy
npm test
npx tsc --noEmit
npm run build

# Dev / prod process
npm run dev
# or
npm run build && pm2 start ecosystem.config.cjs
# pm2 logs intern-board
# pm2 restart intern-board
```

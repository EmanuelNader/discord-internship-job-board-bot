# Next Session Handoff

## State: Plan 1 Complete — Awaiting Merge to `main`

### Branch: `plan/01-scaffold` (HEAD: 9cf549f)

Plan 1 (scaffold + contract + normalize + DB) is fully implemented with 9 tasks completed and reviewed. Ready for final merge to `main`.

### Completed Deliverables

| File | Status |
|------|--------|
| `package.json`, `tsconfig.json`, `vitest.config.ts`, `.env.example`, `.gitignore`, `src/index.ts` | Scaffold |
| `src/lib/types.ts` | Full `Posting` contract types |
| `src/lib/normalize.ts` | `detectLevel`, `detectRoleFamily`, `detectRoleTitles`, `dedupHash` |
| `tests/lib/normalize.test.ts` | 119 table-driven tests, all passing |
| `prisma/schema.prisma` | Posting, Source, ChannelMap models (SQLite) |
| `src/db/client.ts` | PrismaClient singleton |
| `src/config/adapters.config.ts` | 6 adapters with starter companies |
| `src/config/roles.config.ts` | 8 role families, 30 per-title roles |
| `src/config/index.ts` | Re-exports |

### Verification
- `npm test` — 119/119 passing
- `npx tsc --noEmit` — zero errors
- `npm run db:push` — SQLite dev.db created with 3 tables

### What's Next (in order)

#### 1. Merge Plan 1 to main
```bash
git checkout main
git merge plan/01-scaffold
git push origin main
```

#### 2. Plan 2 — Adapters + Scheduler + Backfill
Branch: `plan/02-adapters`
File: `docs/superpowers/plans/2026-07-24-02-adapters-scheduler-backfill.md`
Creates:
- `src/adapters/` — 6 source adapters (Greenhouse, Ashby, Lever, Workday, Simplify, GitHub)
- `src/scheduler/` — SourcesManager + backfill logic
- `tests/adapters/` — fixture-based adapter tests

#### 3. Plan 3 — Poster + Commands + Provisioning + Deploy
Branch: `plan/03-poster`
File: `docs/superpowers/plans/2026-07-24-03-poster-commands-provisioning-deploy.md`
Creates:
- `src/poster/` — rate-limited poster + embed builder
- `src/commands/` — 6 slash commands (/ping, /role, /unrole, /status, /linkchannel, /setup)
- `src/provisioning/` — auto-create channels/roles on boot
- `ecosystem.config.cjs` — PM2 deploy config

### Key Branch Convention
- One branch per plan
- Each plan branch created from `main` after prior plan is merged
- Subagent-driven execution per task
- Task reviews after each task, whole-branch review before merge

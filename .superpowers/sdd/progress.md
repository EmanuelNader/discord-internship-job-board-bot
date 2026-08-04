# SDD Progress Ledger

Repo: EmanuelNader/discord-internship-job-board-bot
Spec: docs/superpowers/specs/2026-07-23-discord-internship-job-board-bot-design.md

## Branches
- `main` — integration target; merges land here. Plans 1–3 merged.
- `plan/01-scaffold` — Plan 1: scaffold + contract + normalize + DB (**complete / merged**)
- `plan/02-adapters` — Plan 2: adapters + scheduler + backfill (**complete / merged**)
- `plan/03-poster` — Plan 3: poster + commands + provisioning (**complete / merged**)
- `plan/04-deploy` — Plan 4: deploy, ops hardening & smoke (**IN PROGRESS**)

## Convention
- One branch per plan. Each plan's tasks are executed subagent-driven on its branch.
- Each completed task = one or more commits on the plan branch (subagents commit).
- After all tasks + final review on a plan branch, merge to `main` and push.
- Record BASE (commit SHA before dispatching implementer) under each task — needed for review-package.

## Progress

### Plan 1 — scaffold + contract + normalize + db (branch plan/01-scaffold)
- Status: **complete / merged to main**
- [x] Task 1: Scaffold
- [x] Task 2: Posting contract types
- [x] Task 3: detectLevel (TDD)
- [x] Task 4: detectRoleFamily (TDD)
- [x] Task 5: detectRoleTitles (TDD)
- [x] Task 6: dedupHash (TDD)
- [x] Task 7: Prisma schema + SQLite
- [x] Task 8: Config files
- [x] Task 9: Full verification + merge to main

### Plan 2 — adapters + scheduler + backfill (branch plan/02-adapters)
- Status: **complete / merged to main**
- [x] All plan tasks complete and merged

### Plan 3 — poster + commands + provisioning (branch plan/03-poster)
- Status: **complete / merged to main**
- Notes: Handoff at `425acd6`; PM2 / full deploy runbook deferred to Plan 4
- [x] All plan tasks complete and merged (deploy ops → Plan 4)

### Plan 4 — deploy, ops hardening & smoke (branch plan/04-deploy)
- Plan: `docs/superpowers/plans/2026-08-04-04-deploy-ops-smoke.md`
- Base of plan ≈ `6b57a42` on `main`
- [x] Task 1: Env bootstrap + validation — `586d661`
- [x] Task 2: Production build (`tsc-alias`) — `f8a8351`
- [x] Task 3: Prisma baseline migration + gitignore — `7dd88dd`
- [x] Task 4: Poster rate-limited queue — `9bcfc04`
- [x] Task 5: Backfill posts to Discord — `54e4bd9`
- [x] Task 6: Graceful shutdown — `65a15e3`
- [x] Task 7: PM2 ecosystem config — `ecosystem.config.cjs` (present on branch)
- [x] Task 8: Deploy runbook + SDD progress — `docs/DEPLOY.md` + this file
- [ ] Task 9: Full verification + smoke checklist + handoff / merge

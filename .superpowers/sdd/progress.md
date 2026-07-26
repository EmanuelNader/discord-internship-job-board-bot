# SDD Progress Ledger

Repo: EmanuelNader/discord-internship-job-board-bot
Spec: docs/superpowers/specs/2026-07-23-discord-internship-job-board-bot-design.md

## Branches
- `main` — integration target; merges land here.
- `plan/01-scaffold` — Plan 1: scaffold + contract + normalize + DB (IN PROGRESS)
- `plan/02-adapters` — Plan 2: adapters + scheduler + backfill (pending)
- `plan/03-poster` — Plan 3: poster + commands + provisioning + deploy (pending)

## Convention
- One branch per plan. Each plan's tasks are executed subagent-driven on its branch.
- Each completed task = one or more commits on the plan branch (subagents commit).
- After all tasks + final review on a plan branch, merge to `main` and push.
- Record BASE (commit SHA before dispatching implementer) under each task — needed for review-package.

## Progress

### Plan 1 — scaffold + contract + normalize + db (branch plan/01-scaffold)
- Base of plan = e059de6 (docs commit on main)
- [x] Task 1: Scaffold — BASE: e059de6, HEAD: eeea736 — review clean
- [x] Task 2: Posting contract types — BASE: eeea736, HEAD: f73078c — review clean
- [x] Task 3: detectLevel (TDD) — BASE: f73078c, HEAD: 11f0131 — review clean
- [x] Task 4: detectRoleFamily (TDD) — BASE: 11f0131, HEAD: a3c6222 — review clean
- [x] Task 5: detectRoleTitles (TDD) — BASE: a3c6222, HEAD: e9820ac — review clean
- [x] Task 6: dedupHash (TDD) — BASE: e9820ac, HEAD: 8279f20 — review clean
- [x] Task 7: Prisma schema + SQLite — BASE: 8279f20, HEAD: f007533 — review clean
- [x] Task 8: Config files — BASE: f007533, HEAD: 9cf549f — review clean
- [ ] Task 9: Full verification + final whole-branch review + merge plan/01 to main + push — BASE: (pending)

### Plan 2 — adapters + scheduler + backfill (branch plan/02-adapters)
- Base of plan = (Plan 1 merge commit on main)
- [ ] Tasks 1-N per plan (pending)

### Plan 3 — poster + commands + provisioning + deploy (branch plan/03-poster)
- Base of plan = (Plan 2 merge commit on main)
- [ ] Tasks 1-N per plan (pending)
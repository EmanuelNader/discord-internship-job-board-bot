# Plan 4 — Deploy, Ops Hardening & Smoke Path

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the bot production-runnable: load env correctly, emit a Node-resolvable build, ship Prisma migrations + PM2 config + a short deploy runbook, fix backfill so first-boot can seed Discord channels, add poster rate limiting + graceful shutdown, then verify with automated checks and a manual smoke checklist.

**Architecture:** Plans 1–3 already deliver adapters → scheduler → SQLite → poster → Discord. This plan hardens the runtime edge: `dotenv` + env validation at boot, `tsc` + `tsc-alias` so `dist/` runs under Node, baseline Prisma migration for `migrate deploy`, PM2 process supervision, and a backfill path that actually posts (rate-limited) so empty servers get content on first launch.

**Tech Stack:** Node.js 20+, TypeScript (existing), Prisma/SQLite, discord.js v14, PM2, `dotenv`, `tsc-alias`

**Base branch:** `main` @ `6b57a42` (or newer). Work on `plan/04-deploy`.

---

## Global Constraints

- All source in `src/`, tests in `tests/`, plans/docs under `docs/`
- ESM throughout (`"type": "module"`)
- TypeScript strict, no `any`
- Keep TDD for new logic (rate limiter, env validation, backfill→poster wiring)
- Do **not** expand product scope (no reaction roles, no new adapters, no new-grad kind)
- Secrets stay in `.env` / PM2 env — never commit tokens
- Existing behavior preserved except where this plan explicitly changes backfill / boot / build

### Known gaps this plan closes

| Gap | Current state | Target |
|-----|---------------|--------|
| Env loading | `dotenv` in deps, never imported | `dotenv/config` at top of `src/index.ts` |
| Path aliases in prod | `tsc` emits `@/...` imports; Node cannot resolve | `tsc && tsc-alias` → relative imports in `dist/` |
| Prisma migrations | Schema only, no `prisma/migrations/` | Baseline migration + `prisma migrate deploy` in runbook |
| PM2 | Missing (Plan 3 Task 6 never landed) | `ecosystem.config.cjs` |
| Backfill → Discord | Inserts with `postedAt` set → channels stay empty | Insert with `postedAt = null`, send via Poster (rate-limited) |
| Poster rate limit | Spec/Plan 3 called for ~1 msg / 2s; not implemented | Queue with 2s spacing |
| Graceful shutdown | Missing | SIGINT/SIGTERM → stop scheduler, disconnect Prisma |
| Deploy docs | Spec §9 only | `docs/DEPLOY.md` short VPS runbook |
| Smoke path | Not documented against current code | Checklist in plan + runbook |

### Explicit non-goals (defer)

- Enabling ashby/lever/workday in config (ops choice after smoke)
- Custom ATS scrapers
- Reaction roles / keyword filters / new-grad channels
- Multi-guild support (bot still uses `guilds.cache.first()`)
- Fixing cross-source dedup counted as `droppedUnclassified` (metric hygiene; separate chore)

---

## File Structure Map (Plan 4 Scope)

```
├── ecosystem.config.cjs              # NEW — PM2
├── docs/DEPLOY.md                    # NEW — VPS runbook + smoke checklist
├── .env.example                      # UPDATE — BACKFILL*, NODE_ENV notes
├── .gitignore                        # UPDATE — prod.db*, *.db-journal
├── package.json                      # UPDATE — build uses tsc-alias; optional pm2 scripts
├── prisma/migrations/…               # NEW — baseline from current schema
├── src/
│   ├── index.ts                      # UPDATE — dotenv, validateEnv, backfill→poster, shutdown
│   ├── config/env.ts                 # NEW — required/optional env parsing
│   ├── poster/
│   │   └── index.ts                  # UPDATE — rate-limited send queue
│   └── scheduler/
│       └── backfill.ts               # UPDATE — leave postedAt null; invoke onNewPosting
├── tests/
│   ├── config/env.test.ts            # NEW
│   ├── poster/index.test.ts          # UPDATE — rate-limit assertions
│   └── scheduler/backfill.test.ts    # UPDATE — postedAt null + callback
└── .superpowers/sdd/
    ├── progress.md                   # UPDATE — Plan 4 tracking
    └── NEXT-SESSION-HANDOFF.md       # UPDATE after merge
```

---

## Task 1: Env bootstrap + validation

**Files:**
- Create: `src/config/env.ts`
- Create: `tests/config/env.test.ts`
- Modify: `src/index.ts` (load dotenv first; call `validateEnv()`)
- Modify: `.env.example`

**Behavior:**
- Required: `DISCORD_TOKEN`, `DATABASE_URL`
- Optional: `GITHUB_TOKEN`, `BACKFILL` (`"true"` / else false), `BACKFILL_LIMIT` (default `50`), `NODE_ENV`
- Fail fast with a clear message listing missing keys (exit 1) before Discord login

- [ ] **Step 1.1:** Write failing tests for `validateEnv`

```ts
// tests/config/env.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { validateEnv } from "@/config/env";

describe("validateEnv", () => {
  const original = { ...process.env };

  beforeEach(() => {
    process.env = { ...original };
  });

  afterEach(() => {
    process.env = { ...original };
  });

  it("returns parsed config when required vars present", () => {
    process.env.DISCORD_TOKEN = "tok";
    process.env.DATABASE_URL = "file:./dev.db";
    process.env.BACKFILL = "true";
    process.env.BACKFILL_LIMIT = "5";

    const env = validateEnv();
    expect(env.DISCORD_TOKEN).toBe("tok");
    expect(env.DATABASE_URL).toBe("file:./dev.db");
    expect(env.BACKFILL).toBe(true);
    expect(env.BACKFILL_LIMIT).toBe(5);
  });

  it("defaults BACKFILL to false and BACKFILL_LIMIT to 50", () => {
    process.env.DISCORD_TOKEN = "tok";
    process.env.DATABASE_URL = "file:./dev.db";
    delete process.env.BACKFILL;
    delete process.env.BACKFILL_LIMIT;

    const env = validateEnv();
    expect(env.BACKFILL).toBe(false);
    expect(env.BACKFILL_LIMIT).toBe(50);
  });

  it("throws when DISCORD_TOKEN missing", () => {
    delete process.env.DISCORD_TOKEN;
    process.env.DATABASE_URL = "file:./dev.db";
    expect(() => validateEnv()).toThrow(/DISCORD_TOKEN/);
  });

  it("throws when DATABASE_URL missing", () => {
    process.env.DISCORD_TOKEN = "tok";
    delete process.env.DATABASE_URL;
    expect(() => validateEnv()).toThrow(/DATABASE_URL/);
  });
});
```

- [ ] **Step 1.2:** Implement `src/config/env.ts`

```ts
export interface AppEnv {
  DISCORD_TOKEN: string;
  DATABASE_URL: string;
  GITHUB_TOKEN?: string;
  BACKFILL: boolean;
  BACKFILL_LIMIT: number;
  NODE_ENV: string;
}

export function validateEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  const missing: string[] = [];
  if (!env.DISCORD_TOKEN?.trim()) missing.push("DISCORD_TOKEN");
  if (!env.DATABASE_URL?.trim()) missing.push("DATABASE_URL");
  if (missing.length > 0) {
    throw new Error(`Missing required env: ${missing.join(", ")}`);
  }

  const limitRaw = env.BACKFILL_LIMIT;
  const limit = limitRaw ? Number(limitRaw) : 50;
  if (!Number.isFinite(limit) || limit < 1) {
    throw new Error("BACKFILL_LIMIT must be a positive number");
  }

  return {
    DISCORD_TOKEN: env.DISCORD_TOKEN!,
    DATABASE_URL: env.DATABASE_URL!,
    GITHUB_TOKEN: env.GITHUB_TOKEN?.trim() || undefined,
    BACKFILL: env.BACKFILL === "true",
    BACKFILL_LIMIT: limit,
    NODE_ENV: env.NODE_ENV ?? "development",
  };
}
```

- [ ] **Step 1.3:** Update `src/index.ts` — first lines:

```ts
import "dotenv/config";
import { validateEnv } from "@/config/env";

const env = validateEnv();
// replace process.env.DISCORD_TOKEN / BACKFILL reads with env.*
```

Remove the duplicate `if (!process.env.DISCORD_TOKEN) process.exit(1)` block once `validateEnv` covers it.

- [ ] **Step 1.4:** Update `.env.example`

```env
DISCORD_TOKEN=your_dev_bot_token_here
GITHUB_TOKEN=your_github_pat_here
DATABASE_URL="file:./dev.db"

# First-boot channel seeding (posts to Discord, rate-limited)
BACKFILL=false
BACKFILL_LIMIT=50

# NODE_ENV=production
```

- [ ] **Step 1.5:** `npm test -- tests/config/env.test.ts` — pass

- [ ] **Step 1.6:** Commit

```bash
git add src/config/env.ts tests/config/env.test.ts src/index.ts .env.example
git commit -m "$(cat <<'EOF'
feat(config): validate required env at boot via dotenv

EOF
)"
```

---

## Task 2: Production build — resolve `@/` aliases

**Why:** `tsc` alone leaves `import … from "@/…"` in `dist/`. `node dist/index.js` fails. Dev works because `tsx` + Vitest resolve the alias.

**Files:**
- Modify: `package.json` (devDependency + `build` script)
- No source import rewrites required if `tsc-alias` runs after `tsc`

- [ ] **Step 2.1:** Install

```bash
npm install -D tsc-alias
```

- [ ] **Step 2.2:** Update `package.json` scripts

```json
"build": "tsc && tsc-alias -p tsconfig.json",
"start": "node dist/index.js"
```

Optional convenience (do not require global PM2):

```json
"pm2:start": "pm2 start ecosystem.config.cjs",
"pm2:logs": "pm2 logs intern-board"
```

- [ ] **Step 2.3:** Verify build locally

```bash
npm run build
node -e "import('./dist/index.js').catch(e => { console.error(e.message); process.exit(1) })"
```

Expect: process starts env validation / Discord login attempt — **must not** throw `Cannot find package '@/…'`. (Without a token it should exit via `validateEnv` after dotenv — use a throwaway `.env` or `DISCORD_TOKEN=x DATABASE_URL=file:./dev.db` for this check, then Ctrl-C if it reaches login.)

Safer smoke of aliases only:

```bash
node --input-type=module -e "import { validateEnv } from './dist/config/env.js'; console.log(typeof validateEnv)"
```

- [ ] **Step 2.4:** Commit

```bash
git add package.json package-lock.json
git commit -m "$(cat <<'EOF'
build: resolve path aliases in dist via tsc-alias

EOF
)"
```

---

## Task 3: Prisma baseline migration + ignore prod DB files

**Files:**
- Create: `prisma/migrations/<timestamp>_init/migration.sql` (via Prisma CLI)
- Modify: `.gitignore`

**Notes:**
- Schema already includes `contentHash`, `publishedAt`, `droppedNonUS` — baseline must match **current** `schema.prisma`, not the original design snippet.
- Prefer `prisma migrate diff` / `migrate dev` against a fresh DB rather than hand-writing SQL.

- [ ] **Step 3.1:** Ensure DB URL for migration generation

```bash
export DATABASE_URL="file:./migrate-tmp.db"
npx prisma migrate dev --name init --create-only
# review SQL, then:
npx prisma migrate dev
rm -f prisma/migrate-tmp.db prisma/migrate-tmp.db-journal 2>/dev/null || true
```

If an existing `dev.db` already matches schema via `db push`, baseline with:

```bash
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > /tmp/init.sql
# then create migration folder and place SQL, mark applied on dev if needed
```

Use whichever path Prisma accepts cleanly; the deliverable is a committed `prisma/migrations/**/migration.sql` that recreates the current schema.

- [ ] **Step 3.2:** Update `.gitignore`

```gitignore
node_modules/
dist/
dev.db
dev.db-journal
prod.db
prod.db-journal
*.db
*.db-journal
.env
*.log
.DS_Store
coverage/
```

Keep `prisma/migrations/` tracked.

- [ ] **Step 3.3:** Verify deploy path

```bash
DATABASE_URL="file:./tmp-deploy-check.db" npx prisma migrate deploy
rm -f tmp-deploy-check.db tmp-deploy-check.db-journal
```

- [ ] **Step 3.4:** Commit

```bash
git add prisma/migrations .gitignore
git commit -m "$(cat <<'EOF'
chore(db): add Prisma baseline migration for migrate deploy

EOF
)"
```

---

## Task 4: Poster rate-limited queue

**Files:**
- Modify: `src/poster/index.ts`
- Modify: `tests/poster/index.test.ts`

**Behavior:**
- `send()` enqueues work; worker drains at **1 send burst per channel-loop job every 2000ms** (configurable via constructor `intervalMs = 2000`)
- Preserve existing ChannelMap lookup, ping roles, `postedAt` update, channel cache, per-channel error isolation
- `stop()` clears the queue timer (for graceful shutdown)
- Concurrent `send()` calls must not bypass the spacing

- [ ] **Step 4.1:** Extend / rewrite tests — assert spacing with fake timers

```ts
// tests/poster/index.test.ts (additions)
import { vi } from "vitest";

it("spaces Discord sends by intervalMs", async () => {
  vi.useFakeTimers();
  // mock client.channels.fetch + channel.send
  // call poster.send(postingA, hashA) and poster.send(postingB, hashB) back-to-back
  // first send runs immediately (or after queue kick); second only after advanceTimersByTimeAsync(2000)
  vi.useRealTimers();
});
```

Adapt to the existing mock style in `tests/poster/index.test.ts` — do not invent a second mock framework.

- [ ] **Step 4.2:** Implement queue in `Poster`

Sketch:

```ts
type QueueItem = { posting: PostingToSend; dedupHash: string; resolve: () => void; reject: (e: unknown) => void };

export class Poster {
  private queue: QueueItem[] = [];
  private draining = false;
  private stopped = false;

  constructor(
    private readonly client: Client,
    private readonly prismaClient?: typeof prisma,
    private readonly intervalMs = 2000
  ) {}

  async send(posting: PostingToSend, dedupHash: string): Promise<void> {
    if (this.stopped) throw new Error("Poster stopped");
    return new Promise((resolve, reject) => {
      this.queue.push({ posting, dedupHash, resolve, reject });
      void this.drain();
    });
  }

  stop(): void {
    this.stopped = true;
    this.queue = [];
  }

  private async drain(): Promise<void> {
    if (this.draining) return;
    this.draining = true;
    try {
      while (this.queue.length > 0 && !this.stopped) {
        const item = this.queue.shift()!;
        try {
          await this.deliver(item.posting, item.dedupHash); // existing send body
          item.resolve();
        } catch (e) {
          item.reject(e);
        }
        if (this.queue.length > 0) {
          await new Promise((r) => setTimeout(r, this.intervalMs));
        }
      }
    } finally {
      this.draining = false;
    }
  }
}
```

Move today’s `send` body into private `deliver()`.

- [ ] **Step 4.3:** `npm test -- tests/poster` — pass

- [ ] **Step 4.4:** Commit

```bash
git add src/poster/index.ts tests/poster/index.test.ts
git commit -m "$(cat <<'EOF'
feat(poster): rate-limit Discord sends to 1 job / 2s

EOF
)"
```

---

## Task 5: Backfill posts to Discord

**Files:**
- Modify: `src/scheduler/backfill.ts`
- Modify: `tests/scheduler/backfill.test.ts`
- Modify: `src/index.ts`

**Behavior change (intentional):**
- **Before:** create row with `postedAt: new Date()` → never appears in Discord
- **After:** create row with `postedAt` unset/`null`; for each newly created row call `onNewPosting` (same shape as `SourcesManager`)
- Cross-source `contentHash` skip + US/level/family filters unchanged
- Upsert `update: {}` still means already-seen rows are not re-posted
- `BACKFILL=true` is one-shot at boot (still gated by env); operators should set `BACKFILL=false` after first successful seed (document in `DEPLOY.md`)

- [ ] **Step 5.1:** Update backfill tests
  - Assert created rows have `postedAt === null`
  - Assert `onNewPosting` invoked once per newly inserted posting
  - Assert existing `dedupHash` / `contentHash` does not call `onNewPosting`

- [ ] **Step 5.2:** Change `runBackfill` signature

```ts
export async function runBackfill(
  options: BackfillOptions,
  onNewPosting: (
    posting: {
      title: string;
      company: string;
      location: string | null;
      url: string;
      sourceName: string;
      roleFamily: string[];
      roleTitles: string[];
      level: string;
      postedAt?: Date;
    },
    dedupHash: string
  ) => Promise<void>
): Promise<void> {
  // ...
  // create without postedAt
  // after create, if row has postedAt == null, await onNewPosting({... postedAt: publishedAt ?? firstSeenAt }, hash)
}
```

Mirror the posting payload construction already used in `SourcesManager.runAdapter` (including `postedAt: existing.publishedAt ?? existing.firstSeenAt` for the embed date field — that field is display-only; DB `postedAt` remains null until Poster succeeds).

- [ ] **Step 5.3:** Wire in `src/index.ts`

```ts
const poster = new Poster(client, prisma);

if (env.BACKFILL) {
  console.log(`Running backfill (limit ${env.BACKFILL_LIMIT} per source)...`);
  await runBackfill(
    { enabled: true, limitPerSource: env.BACKFILL_LIMIT },
    (posting, hash) => poster.send(posting, hash)
  );
  console.log("Backfill complete");
}

const manager = new SourcesManager(
  getAllAdapters(),
  (posting, hash) => poster.send(posting, hash),
  (source, error) => console.error(`[${source}] ${error.message}`)
);
manager.start();
```

Order: provision → deploy commands → poster → optional backfill → start scheduler.

- [ ] **Step 5.4:** `npm test -- tests/scheduler/backfill.test.ts tests/scheduler/index.test.ts` — pass

- [ ] **Step 5.5:** Commit

```bash
git add src/scheduler/backfill.ts tests/scheduler/backfill.test.ts src/index.ts
git commit -m "$(cat <<'EOF'
fix(backfill): post seeded jobs to Discord instead of silent DB insert

EOF
)"
```

---

## Task 6: Graceful shutdown

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 6.1:** Keep `SourcesManager` + `Poster` references outside the ready handler (module scope or shared `let`) so signal handlers can stop them.

```ts
let manager: SourcesManager | null = null;
let poster: Poster | null = null;

async function shutdown(signal: string) {
  console.log(`Received ${signal}, shutting down...`);
  manager?.stop();
  poster?.stop();
  await prisma.$disconnect();
  client.destroy();
  process.exit(0);
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
```

- [ ] **Step 6.2:** `npx tsc --noEmit` clean

- [ ] **Step 6.3:** Commit

```bash
git add src/index.ts
git commit -m "$(cat <<'EOF'
feat: graceful shutdown on SIGINT/SIGTERM

EOF
)"
```

---

## Task 7: PM2 ecosystem config

**Files:**
- Create: `ecosystem.config.cjs`

PM2 loads `.env` via `dotenv` in the app; ecosystem should **not** hardcode secrets. Prefer `env_file` if PM2 version supports it, else document “export env before `pm2 start`” / use a local untracked `ecosystem.local.cjs`. Simplest portable approach:

```js
// ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: "intern-board",
      script: "dist/index.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      time: true,
      env: {
        NODE_ENV: "production",
        // Secrets come from the process environment or a dotenv file loaded by the app.
        // Set DISCORD_TOKEN, DATABASE_URL, GITHUB_TOKEN, BACKFILL on the host before start.
      },
    },
  ],
};
```

- [ ] **Step 7.1:** Write `ecosystem.config.cjs` as above

- [ ] **Step 7.2:** Commit

```bash
git add ecosystem.config.cjs package.json
git commit -m "$(cat <<'EOF'
chore(deploy): add PM2 ecosystem config

EOF
)"
```

---

## Task 8: Deploy runbook + smoke checklist

**Files:**
- Create: `docs/DEPLOY.md`
- Modify: `.superpowers/sdd/progress.md` (add Plan 4 section; mark Plans 1–3 complete)

### `docs/DEPLOY.md` must include

1. **Prereqs** — Node 20+, Discord bot token (dev vs prod apps), bot invited with Manage Channels + Manage Roles + Send Messages + Embed Links + Use Application Commands
2. **Local**
   - `cp .env.example .env` → fill values
   - `npm ci`
   - `npx prisma migrate deploy`
   - `npm test && npm run build`
   - `npm run dev`
3. **VPS**
   - clone → `npm ci` → `npx prisma migrate deploy` → `npm run build`
   - place `.env` with `DATABASE_URL="file:./prod.db"`, `BACKFILL=true` only on first boot
   - `pm2 start ecosystem.config.cjs` → `pm2 save` → `pm2 startup`
   - logs: `pm2 logs intern-board`
4. **First-boot Discord**
   - Invite bot → online → `/setup`
   - Confirm 8 channels + ping roles
   - With `BACKFILL=true`, confirm embeds appear (rate-limited); then set `BACKFILL=false` and `pm2 restart intern-board`
   - `/status`, `/ping`, `/role`, `/unrole`
   - Wait one poll cycle — no duplicate posts for same job
5. **Ops notes**
   - Separate Discord application for prod vs local
   - Rotate tokens if leaked
   - SQLite file backup (`cp prod.db backups/…`)

- [ ] **Step 8.1:** Write `docs/DEPLOY.md`

- [ ] **Step 8.2:** Sync `.superpowers/sdd/progress.md`:
  - Mark Plans 1–3 fully complete / merged
  - Add Plan 4 branch `plan/04-deploy` with task checklist mirroring this plan

- [ ] **Step 8.3:** Commit

```bash
git add docs/DEPLOY.md .superpowers/sdd/progress.md
git commit -m "$(cat <<'EOF'
docs: add VPS deploy runbook and refresh SDD progress

EOF
)"
```

---

## Task 9: Full verification

**Files:** none new (unless fixes required)

- [ ] **Step 9.1:** Clean install + migrate + test + types + build

```bash
npm ci
npx prisma migrate deploy
npm test
npx tsc --noEmit
npm run build
node --input-type=module -e "import { validateEnv } from './dist/config/env.js'; console.log('ok')"
```

- [ ] **Step 9.2:** Manual smoke (dev bot / dev guild) — check off in PR description:

```
- [ ] Bot online with dotenv-loaded token
- [ ] /setup creates channels + roles + ChannelMap
- [ ] BACKFILL=true BACKFILL_LIMIT=5 posts embeds (not silent DB-only)
- [ ] Role pings only matched titles
- [ ] /status shows counters including dropped-non-US
- [ ] Second poll does not duplicate
- [ ] SIGINT exits cleanly (pm2 or npm run dev)
- [ ] After BACKFILL=false restart, live poll still posts new jobs
```

- [ ] **Step 9.3:** Update `.superpowers/sdd/NEXT-SESSION-HANDOFF.md` for Plan 4 complete (or “awaiting smoke”)

- [ ] **Step 9.4:** Final commit if handoff/docs changed

```bash
git add .superpowers/sdd/NEXT-SESSION-HANDOFF.md
git commit -m "$(cat <<'EOF'
chore(sdd): handoff after Plan 4 deploy path

EOF
)"
```

- [ ] **Step 9.5:** Merge `plan/04-deploy` → `main` after review (human or subagent review package)

---

## Plan 4 Deliverables (Definition of Done)

- [ ] `src/config/env.ts` + tests — fail-fast env validation
- [ ] `dotenv/config` loaded at boot
- [ ] `npm run build` produces runnable `dist/` (`tsc-alias`)
- [ ] Baseline `prisma/migrations` committed; `prisma migrate deploy` works on empty DB
- [ ] `ecosystem.config.cjs` present
- [ ] `docs/DEPLOY.md` ready for VPS + smoke
- [ ] Poster rate-limited (~2s)
- [ ] Backfill posts to Discord via Poster
- [ ] Graceful SIGINT/SIGTERM shutdown
- [ ] `.env.example` / `.gitignore` / SDD progress updated
- [ ] `npm test`, `tsc --noEmit`, `npm run build` green

---

## Execution Handoff

**Plan saved to `docs/superpowers/plans/2026-08-04-04-deploy-ops-smoke.md`.**

**1. Subagent-Driven (recommended)** — `superpowers:subagent-driven-development`, one task per subagent, review between tasks.

**2. Inline Execution** — `superpowers:executing-plans`, same branch, checkbox-by-checkbox.

**Suggested branch:** `plan/04-deploy` from current `main`.

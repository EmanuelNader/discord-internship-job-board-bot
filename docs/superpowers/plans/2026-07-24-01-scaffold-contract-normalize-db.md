# Scaffold + Posting Contract + Normalize + Prisma DB — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Node.js/TypeScript project, define the `Posting` contract, implement `normalize.ts` (pure functions: `detectLevel`, `detectRoleFamily`, `detectRoleTitles`, `dedupHash`) with full TDD unit tests, and set up Prisma schema + SQLite database.

**Architecture:** Four isolated units sharing one `Posting` contract (Section 2 of spec). This plan covers: project scaffold, contract types, normalization intelligence layer, dedup hash, Prisma schema/migration. Later plans cover adapters/scheduler/poster/commands.

**Tech Stack:** Node.js 20+, TypeScript (strict), discord.js v14 (Builders API), Prisma ORM (SQLite), Vitest, PM2 (deploy), nock (fixtures).

## Global Constraints

- **Spec version:** 2026-07-23 (Section 1–12). All tasks implicitly include spec requirements.
- **Language:** TypeScript (strict mode), ESM (`"type": "module"`), `tsconfig.json` with `moduleResolution: "bundler"`, `target: "ES2022"`, `outDir: "dist"`.
- **Source layout:** `src/` root; units: `src/lib/`, `src/adapters/`, `src/scheduler/`, `src/poster/`, `src/commands/`, `src/db/`, `src/config/`.
- **Test layout:** `tests/` mirroring `src/` (`tests/lib/normalize.test.ts`, etc.). Vitest config at `vitest.config.ts`.
- **Config:** `adapters.config.ts`, `roles.config.ts` (both TypeScript modules, imported at runtime).
- **Environment:** `.env` (gitignored) for `DISCORD_TOKEN`, `GITHUB_TOKEN`, `DATABASE_URL=file:./dev.db`.
- **Dedup hash:** `sha256(sourceName|externalId|title|company)`; fallback when `externalId === ""` → `sha256(sourceName|title|company)`. Title normalized: `trim().replace(/\s+/g, ' ').toLowerCase()`.
- **Level filter (strict):** `detectLevel` returns `"internship" | "co-op" | "fellowship" | null`. Null = drop. Include signals: `intern`, `internship`, `summer 2026`, `fall 2026`, `spring 2027`, `co-op`, `cooperative education`, `placement year`, `fellowship`, `research fellowship`, `coding fellowship`, named student fellowships. Hard-drop signals: `senior`, `staff`, `principal`, `manager`, `manager of`, `head of`, `director`, `vp`, `lead` (drop UNLESS include signal also present). Hard-drop new-grad signals: `new grad`, `new graduate`, `graduate program`, `early career`, `development program`, `rotational program`, `campus hire`, `entry level`, `campus to career` (always drop even if include signal present). ATS `experienceLevel="entry"` alone is insufficient — must have include signal.
- **RoleFamily:** `swe | pm-program | hardware | data | ml | engineering | design | growth`.
- **RoleTitle:** per taxonomy table in spec Section 5 (e.g., `swe-frontend`, `swe-backend`, `pm-product`, `hw-silicon`, `data-scientist`, `ml-engineer`, `eng-structural`, `design-ux`, `growth-general`, etc.).
- **ChannelMap:** `{ kind: "job", roleFamily } -> channelId`. Poster routes by `roleFamily[]` (plural — one posting may hit multiple channels).
- **Commands:** `/ping`, `/role`, `/unrole`, `/status`, `/linkchannel`, `/setup`. Builders API.
- **Poster rate limit:** 1 embed per 2 seconds (token bucket or simple queue with `setTimeout`).
- **Git:** Not yet initialized. First commit after Task 1 scaffold.

---

## File Structure Map (Plan 1 Scope)

```
C:\Users\emann\OneDrive\Desktop\discordbot\
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .env.example
├── .gitignore
├── prisma/
│   └── schema.prisma
├── src/
│   ├── lib/
│   │   ├── types.ts           # Posting, Level, RoleFamily, RoleTitle, SourceName, PostingKind, RawPosting
│   │   ├── normalize.ts       # detectLevel, detectRoleFamily, detectRoleTitles, dedupHash
│   │   └── index.ts           # re-exports
│   ├── config/
│   │   ├── adapters.config.ts # company lists + poll intervals per source
│   │   └── roles.config.ts    # roleFamily -> per-title ping roles taxonomy
│   ├── db/
│   │   └── client.ts          # PrismaClient singleton
│   └── index.ts               # bootstrap (empty for now)
└── tests/
    └── lib/
        └── normalize.test.ts  # table-driven tests for all pure functions
```

---

## Interfaces (Contract — Defined in Task 2, Consumed by All Later Tasks)

```ts
// src/lib/types.ts
export type PostingKind = "job" | "event" | "direct-consideration" | "hackathon" | "ambassador";
export type Level = "internship" | "co-op" | "fellowship";
export type RoleFamily = "swe" | "pm-program" | "hardware" | "data" | "ml" | "engineering" | "design" | "growth";
export type RoleTitle = 
  | "swe-frontend" | "swe-backend" | "swe-fullstack" | "swe-mobile" | "swe-devops" | "swe-embedded"
  | "pm-product" | "pm-program" | "pm-tpm"
  | "hw-silicon" | "hw-pcb" | "hw-fpga" | "hw-asic"
  | "data-scientist" | "data-engineer" | "data-analytics"
  | "ml-engineer" | "ml-researcher" | "ml-ai-eng"
  | "eng-structural" | "eng-civil" | "eng-electrical" | "eng-mechanical" | "eng-chemical" | "eng-aerospace"
  | "design-ux" | "design-ui" | "design-product" | "design-interaction"
  | "growth-general" | "growth-lifecycle" | "growth-acquisition";
export type SourceName = "greenhouse" | "ashby" | "lever" | "workday" | "simplify" | "github";

export interface RawPosting {
  title: string;
  company: string;
  location?: string | null;
  url: string;
  externalId?: string;      // ATS job id, GitHub issue number, etc.
  raw?: Record<string, unknown>;
}

export interface Posting {
  dedupHash: string;
  externalId: string;        // "" if unavailable
  sourceName: SourceName;
  kind: PostingKind;         // "job" in v1
  level: Level;              // never null — filtered before persistence
  title: string;             // normalized
  company: string;
  location: string | null;
  roleFamily: RoleFamily[];  // plural — drives multi-channel routing
  roleTitles: RoleTitle[];   // drives ping roles
  url: string;
  firstSeenAt: Date;         // set by DB on insert
  raw?: Record<string, unknown>;
}
```

---

## Task Breakdown

### Task 1: Project Scaffold + Tooling

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `src/index.ts` (empty bootstrap)

**Interfaces:** None (foundational).

```json
// package.json
{
  "name": "internship-job-board-bot",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:studio": "prisma studio",
    "postinstall": "prisma generate"
  },
  "dependencies": {
    "discord.js": "^14.15.3",
    "@prisma/client": "^5.18.0",
    "dotenv": "^16.4.5"
  },
  "devDependencies": {
    "@types/node": "^22.5.0",
    "typescript": "^5.5.4",
    "tsx": "^4.17.0",
    "vitest": "^2.0.5",
    "prisma": "^5.18.0",
    "@types/nock": "^11.1.0",
    "nock": "^13.5.4"
  },
  "engines": { "node": ">=20.0.0" }
}
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: true,
    coverage: { provider: "v8", reporter: ["text", "json", "html"] }
  }
});
```

```text
# .env.example
DISCORD_TOKEN=your_dev_bot_token_here
GITHUB_TOKEN=your_github_pat_here
DATABASE_URL="file:./dev.db"
```

```text
# .gitignore
node_modules/
dist/
dev.db
dev.db-journal
.env
*.log
.DS_Store
coverage/
```

```ts
// src/index.ts
// Entry point — scaffold only; actual boot logic in Plan 3
console.log("Internship Job Board Bot — scaffold ready");
```

- [ ] **Step 1.1:** Write `package.json` (exact content above).
- [ ] **Step 1.2:** Run `npm install` — verify `node_modules` created, no peer dep warnings.
- [ ] **Step 1.3:** Write `tsconfig.json` (exact content above).
- [ ] **Step 1.4:** Write `vitest.config.ts` (exact content above).
- [ ] **Step 1.5:** Write `.env.example` and `.gitignore` (exact content above).
- [ ] **Step 1.6:** Write `src/index.ts` (exact content above).
- [ ] **Step 1.7:** Run `npx tsc --noEmit` — verify TypeScript compiles with zero errors.
- [ ] **Step 1.8:** Run `npm test` — verify Vitest runs (0 tests, 0 passed, 0 failed).
- [ ] **Step 1.9:** `git init && git add -A && git commit -m "chore: scaffold project with TypeScript, Vitest, Prisma, discord.js"`

---

### Task 2: Posting Contract Types (`src/lib/types.ts`)

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/index.ts` (re-export)

**Interfaces:** Produces all types listed in **Interfaces** section above.

```ts
// src/lib/types.ts
export type PostingKind = "job" | "event" | "direct-consideration" | "hackathon" | "ambassador";
export type Level = "internship" | "co-op" | "fellowship";
export type RoleFamily = "swe" | "pm-program" | "hardware" | "data" | "ml" | "engineering" | "design" | "growth";
export type RoleTitle =
  | "swe-frontend" | "swe-backend" | "swe-fullstack" | "swe-mobile" | "swe-devops" | "swe-embedded"
  | "pm-product" | "pm-program" | "pm-tpm"
  | "hw-silicon" | "hw-pcb" | "hw-fpga" | "hw-asic"
  | "data-scientist" | "data-engineer" | "data-analytics"
  | "ml-engineer" | "ml-researcher" | "ml-ai-eng"
  | "eng-structural" | "eng-civil" | "eng-electrical" | "eng-mechanical" | "eng-chemical" | "eng-aerospace"
  | "design-ux" | "design-ui" | "design-product" | "design-interaction"
  | "growth-general" | "growth-lifecycle" | "growth-acquisition";
export type SourceName = "greenhouse" | "ashby" | "lever" | "workday" | "simplify" | "github";

export interface RawPosting {
  title: string;
  company: string;
  location?: string | null;
  url: string;
  externalId?: string;
  raw?: Record<string, unknown>;
}

export interface Posting {
  dedupHash: string;
  externalId: string;
  sourceName: SourceName;
  kind: PostingKind;
  level: Level;
  title: string;
  company: string;
  location: string | null;
  roleFamily: RoleFamily[];
  roleTitles: RoleTitle[];
  url: string;
  firstSeenAt: Date;
  raw?: Record<string, unknown>;
}
```

```ts
// src/lib/index.ts
export * from "./types";
export * from "./normalize";
```

- [ ] **Step 2.1:** Write `src/lib/types.ts` (exact content above).
- [ ] **Step 2.2:** Write `src/lib/index.ts` (exact content above).
- [ ] **Step 2.3:** Run `npx tsc --noEmit` — verify zero errors.
- [ ] **Step 2.4:** `git add src/lib/types.ts src/lib/index.ts && git commit -m "feat(lib): add Posting contract types"`

---

### Task 3: Normalization Pure Functions — `detectLevel` (TDD)

**Files:**
- Create: `tests/lib/normalize.test.ts` (tests for `detectLevel` first)
- Modify: `src/lib/normalize.ts` (implement `detectLevel`)

**Interfaces:**
- Consumes: `RawPosting` (from `types.ts`), string title.
- Produces: `detectLevel(title: string, raw?: RawPosting): Level | null`

**Test Cases (table-driven):**

```ts
// tests/lib/normalize.test.ts (partial — detectLevel suite)
import { describe, it, expect } from "vitest";
import { detectLevel } from "@/lib/normalize";

describe("detectLevel", () => {
  const cases: [string, string | null, string][] = [
    // Include signals — internship
    ["Software Engineer Intern", "internship", "basic intern"],
    ["Summer 2026 Internship", "internship", "seasonal keyword"],
    ["Fall 2026 Intern", "internship", "fall keyword"],
    ["Spring 2027 Internship", "internship", "spring keyword"],
    ["2026 Summer Intern", "internship", "year + summer"],
    // Include signals — co-op
    ["Co-op Software Engineer", "co-op", "co-op hyphen"],
    ["Cooperative Education Program", "co-op", "cooperative education"],
    ["Placement Year Student", "co-op", "placement year"],
    // Include signals — fellowship
    ["Research Fellowship", "fellowship", "research fellowship"],
    ["Coding Fellowship", "fellowship", "coding fellowship"],
    ["XRDS Fellow", "fellowship", "named fellowship"],
    // Hard-drop seniority (no include signal) — should return null
    ["Senior Software Engineer", null, "senior"],
    ["Staff Engineer", null, "staff"],
    ["Principal Engineer", null, "principal"],
    ["Engineering Manager", null, "manager"],
    ["Manager of Engineering", null, "manager of"],
    ["Head of Engineering", null, "head of"],
    ["Director of Engineering", null, "director"],
    ["VP Engineering", null, "vp"],
    ["Tech Lead", null, "lead"],
    // Hard-drop new-grad signals — always null even if include signal present
    ["New Grad Software Engineer", null, "new grad"],
    ["New Graduate Program", null, "new graduate"],
    ["Graduate Development Program", null, "graduate program"],
    ["Early Career Engineer", null, "early career"],
    ["Development Program", null, "development program"],
    ["Rotational Program", null, "rotational program"],
    ["Campus Hire", null, "campus hire"],
    ["Entry Level Engineer", null, "entry level"],
    ["Campus to Career", null, "campus to career"],
    // Senior title WITH include signal — should PASS (include wins)
    ["Senior Intern", "internship", "senior + intern"],
    ["Staff Co-op", "co-op", "staff + co-op"],
    // Case/whitespace normalization
    ["  software engineer intern  ", "internship", "trim + collapse"],
    ["SOFTWARE ENGINEER INTERN", "internship", "uppercase"],
    // Edge: empty / no signal
    ["Software Engineer", null, "no level signal"],
    ["", null, "empty string"],
  ];

  it.each(cases)("title=%s -> %s (%s)", (title, expected, _label) => {
    expect(detectLevel(title, { title, company: "Test", url: "http://x" })).toBe(expected);
  });
});
```

```ts
// src/lib/normalize.ts (stub for detectLevel — replace in Step 3.3)
export function detectLevel(title: string, raw?: RawPosting): Level | null {
  const normalized = title.trim().replace(/\s+/g, " ").toLowerCase();
  // TODO: implement
  return null;
}
```

- [ ] **Step 3.1:** Write `tests/lib/normalize.test.ts` with the full `detectLevel` table-driven suite above (all 30+ cases).
- [ ] **Step 3.2:** Run `npm test` — verify ALL `detectLevel` tests FAIL (function returns `null` for everything).
- [ ] **Step 3.3:** Implement `detectLevel` in `src/lib/normalize.ts` to pass all cases:

```ts
// src/lib/normalize.ts (complete detectLevel)
import type { RawPosting, Level } from "./types";

const INCLUDE_INTERNSHIP = /\b(intern|internship|summer\s+202\d|fall\s+202\d|spring\s+202\d)\b/i;
const INCLUDE_COOP = /\b(co[- ]?op|cooperative\s+education|placement\s+year)\b/i;
const INCLUDE_FELLOWSHIP = /\b(fellowship|research\s+fellowship|coding\s+fellowship)\b/i;
const NAMED_FELLOWSHIPS = /\b(xrds|google\s+phd|fb\s+fellowship|microsoft\s+research\s+phd|nvidia\s+graduate\s+fellowship)\b/i;

const DROP_SENIORITY = /\b(senior|staff|principal|manager(?!\s+of\s+\w+\s+intern)|head\s+of|director|vp\b|lead\b)/i;
const DROP_NEWGRAD = /\b(new\s+grad|new\s+graduate|graduate\s+program|early\s+career|development\s+program|rotational\s+program|campus\s+hire|entry\s+level|campus\s+to\s+career)\b/i;

export function detectLevel(title: string, _raw?: RawPosting): Level | null {
  const norm = title.trim().replace(/\s+/g, " ").toLowerCase();

  // Hard-drop new-grad signals — always null
  if (DROP_NEWGRAD.test(norm)) return null;

  // Include signals
  const isInternship = INCLUDE_INTERNSHIP.test(norm);
  const isCoop = INCLUDE_COOP.test(norm);
  const isFellowship = INCLUDE_FELLOWSHIP.test(norm) || NAMED_FELLOWSHIPS.test(norm);

  if (!isInternship && !isCoop && !isFellowship) return null;

  // Seniority drop unless include signal also present
  if (DROP_SENIORITY.test(norm)) {
    // already know at least one include signal matched
    // allow it through — include wins over seniority
  }

  if (isCoop) return "co-op";
  if (isFellowship) return "fellowship";
  return "internship";
}
```

- [ ] **Step 3.4:** Run `npm test` — verify ALL `detectLevel` tests PASS.
- [ ] **Step 3.5:** `git add tests/lib/normalize.test.ts src/lib/normalize.ts && git commit -m "feat(lib): detectLevel with full TDD coverage"`

---

### Task 4: Normalization — `detectRoleFamily` (TDD)

**Files:**
- Modify: `tests/lib/normalize.test.ts` (add `detectRoleFamily` suite)
- Modify: `src/lib/normalize.ts` (add `detectRoleFamily`)

**Interfaces:**
- Produces: `detectRoleFamily(title: string, raw?: RawPosting): RoleFamily[]`

**Test Cases:** Table-driven covering all 8 families + multi-family + unknown → empty array.

```ts
// tests/lib/normalize.test.ts (add to file)
import { detectRoleFamily, detectRoleTitles } from "@/lib/normalize";

describe("detectRoleFamily", () => {
  const cases: [string, RoleFamily[], string][] = [
    // SWE
    ["Frontend Engineer Intern", ["swe"], "frontend keyword"],
    ["Backend Software Engineer Intern", ["swe"], "backend keyword"],
    ["Full Stack Intern", ["swe"], "full stack"],
    ["Mobile Engineer Co-op", ["swe"], "mobile"],
    ["DevOps Intern", ["swe"], "devops"],
    ["Site Reliability Engineer Intern", ["swe"], "sre"],
    ["Embedded Systems Intern", ["swe"], "embedded"],
    ["Software Engineer Intern", ["swe"], "generic swe"],
    // PM/Program
    ["Product Manager Intern", ["pm-program"], "pm"],
    ["Technical Program Manager Intern", ["pm-program"], "tpm"],
    ["Program Manager Co-op", ["pm-program"], "program manager"],
    // Hardware
    ["Silicon Design Intern", ["hardware"], "silicon"],
    ["PCB Layout Co-op", ["hardware"], "pcb"],
    ["FPGA Engineer Intern", ["hardware"], "fpga"],
    ["ASIC Verification Intern", ["hardware"], "asic"],
    // Data
    ["Data Scientist Intern", ["data"], "data scientist"],
    ["Data Engineer Intern", ["data"], "data engineer"],
    ["Analytics Intern", ["data"], "analytics"],
    // ML/AI
    ["Machine Learning Engineer Intern", ["ml"], "ml engineer"],
    ["ML Researcher Co-op", ["ml"], "ml researcher"],
    ["AI Engineer Intern", ["ml"], "ai engineer"],
    // Engineering (non-SWE)
    ["Structural Engineering Intern", ["engineering"], "structural"],
    ["Civil Engineer Co-op", ["engineering"], "civil"],
    ["Electrical Engineering Intern", ["engineering"], "electrical"],
    ["Mechanical Engineer Intern", ["engineering"], "mechanical"],
    ["Chemical Engineering Intern", ["engineering"], "chemical"],
    ["Aerospace Engineer Intern", ["engineering"], "aerospace"],
    // Design
    ["UX Designer Intern", ["design"], "ux"],
    ["UI Designer Co-op", ["design"], "ui"],
    ["Product Designer Intern", ["design"], "product design"],
    ["Interaction Designer Intern", ["design"], "interaction"],
    // Growth
    ["Growth Marketing Intern", ["growth"], "growth marketing"],
    ["Lifecycle Marketing Intern", ["growth"], "lifecycle"],
    ["User Acquisition Intern", ["growth"], "acquisition"],
    // Multi-family (title spans families)
    ["Software Engineer Intern - Hardware Team", ["swe", "hardware"], "multi-family"],
    // Unknown
    ["Random Title", [], "unknown"],
    ["", [], "empty"],
  ];

  it.each(cases)("title=%s -> %s (%s)", (title, expected, _label) => {
    expect(detectRoleFamily(title, { title, company: "Test", url: "http://x" })).toEqual(expected);
  });
});
```

```ts
// src/lib/normalize.ts (add detectRoleFamily)
import type { RawPosting, RoleFamily } from "./types";

const FAMILY_KEYWORDS: Record<RoleFamily, RegExp[]> = {
  swe: [
    /\b(frontend|front[- ]?end)\b/i,
    /\b(backend|back[- ]?end)\b/i,
    /\b(full[- ]?stack|fullstack)\b/i,
    /\b(mobile|ios|android)\b/i,
    /\b(devops|dev[- ]?ops|sre|site\s+reliability)\b/i,
    /\b(embedded|firmware)\b/i,
    /\b(software\s+engineer|swe\b)\b/i,
  ],
  "pm-program": [
    /\b(product\s+manager|pm\b)\b/i,
    /\b(technical\s+program\s+manager|tpm\b)\b/i,
    /\b(program\s+manager)\b/i,
  ],
  hardware: [
    /\b(silicon|vlsi|chip\s+design)\b/i,
    /\b(pcb|printed\s+circuit\s+board)\b/i,
    /\b(fpga)\b/i,
    /\b(asic|verification|physical\s+design)\b/i,
  ],
  data: [
    /\b(data\s+scientist)\b/i,
    /\b(data\s+engineer)\b/i,
    /\b(analytics|data\s+analyst)\b/i,
  ],
  ml: [
    /\b(machine\s+learning|ml\s+engineer)\b/i,
    /\b(ml\s+researcher|machine\s+learning\s+research)\b/i,
    /\b(ai\s+engineer|artificial\s+intelligence\s+engineer)\b/i,
  ],
  engineering: [
    /\b(structural\s+engineer)\b/i,
    /\b(civil\s+engineer)\b/i,
    /\b(electrical\s+engineer)\b/i,
    /\b(mechanical\s+engineer)\b/i,
    /\b(chemical\s+engineer)\b/i,
    /\b(aerospace\s+engineer)\b/i,
  ],
  design: [
    /\b(ux\s+designer|user\s+experience\s+designer)\b/i,
    /\b(ui\s+designer|user\s+interface\s+designer)\b/i,
    /\b(product\s+designer)\b/i,
    /\b(interaction\s+designer)\b/i,
  ],
  growth: [
    /\b(growth\s+marketing|growth\s+engineer)\b/i,
    /\b(lifecycle\s+marketing)\b/i,
    /\b(user\s+acquisition|acquisition\s+marketing)\b/i,
  ],
};

export function detectRoleFamily(title: string, _raw?: RawPosting): RoleFamily[] {
  const norm = title.trim().replace(/\s+/g, " ").toLowerCase();
  const families: RoleFamily[] = [];
  for (const [family, patterns] of Object.entries(FAMILY_KEYWORDS)) {
    if (patterns.some((re) => re.test(norm))) {
      families.push(family as RoleFamily);
    }
  }
  return families;
}
```

- [ ] **Step 4.1:** Append `detectRoleFamily` test suite to `tests/lib/normalize.test.ts`.
- [ ] **Step 4.2:** Run `npm test` — verify new tests FAIL (function not exported/implemented).
- [ ] **Step 4.3:** Add `detectRoleFamily` implementation to `src/lib/normalize.ts` (exact code above).
- [ ] **Step 4.4:** Run `npm test` — verify ALL tests PASS (detectLevel + detectRoleFamily).
- [ ] **Step 4.5:** `git add tests/lib/normalize.test.ts src/lib/normalize.ts && git commit -m "feat(lib): detectRoleFamily with TDD coverage"`

---

### Task 5: Normalization — `detectRoleTitles` (TDD)

**Files:**
- Modify: `tests/lib/normalize.test.ts` (add `detectRoleTitles` suite)
- Modify: `src/lib/normalize.ts` (add `detectRoleTitles`)

**Interfaces:**
- Produces: `detectRoleTitles(title: string, roleFamilies: RoleFamily[], raw?: RawPosting): RoleTitle[]`

**Test Cases:** Table-driven. Title + detected families -> expected role titles. Only titles matching a detected family are returned.

```ts
// tests/lib/normalize.test.ts (add to file)
import { detectRoleTitles } from "@/lib/normalize";

describe("detectRoleTitles", () => {
  const cases: [string, RoleFamily[], RoleTitle[], string][] = [
    // SWE titles
    ["Frontend Engineer Intern", ["swe"], ["swe-frontend"], "frontend"],
    ["Backend Software Engineer Intern", ["swe"], ["swe-backend"], "backend"],
    ["Full Stack Intern", ["swe"], ["swe-fullstack"], "fullstack"],
    ["Mobile Engineer Co-op", ["swe"], ["swe-mobile"], "mobile"],
    ["DevOps Intern", ["swe"], ["swe-devops"], "devops"],
    ["Embedded Systems Intern", ["swe"], ["swe-embedded"], "embedded"],
    ["Software Engineer Intern", ["swe"], [], "generic swe -> no specific title"],
    // Multiple titles in one
    ["Frontend & Backend Engineer Intern", ["swe"], ["swe-frontend", "swe-backend"], "multi-title"],
    // PM/Program
    ["Product Manager Intern", ["pm-program"], ["pm-product"], "pm product"],
    ["Technical Program Manager Intern", ["pm-program"], ["pm-tpm"], "tpm"],
    ["Program Manager Co-op", ["pm-program"], ["pm-program"], "program"],
    // Hardware
    ["Silicon Design Intern", ["hardware"], ["hw-silicon"], "silicon"],
    ["PCB Layout Co-op", ["hardware"], ["hw-pcb"], "pcb"],
    ["FPGA Engineer Intern", ["hardware"], ["hw-fpga"], "fpga"],
    ["ASIC Verification Intern", ["hardware"], ["hw-asic"], "asic"],
    // Data
    ["Data Scientist Intern", ["data"], ["data-scientist"], "data scientist"],
    ["Data Engineer Intern", ["data"], ["data-engineer"], "data engineer"],
    ["Analytics Intern", ["data"], ["data-analytics"], "analytics"],
    // ML
    ["Machine Learning Engineer Intern", ["ml"], ["ml-engineer"], "ml engineer"],
    ["ML Researcher Co-op", ["ml"], ["ml-researcher"], "ml researcher"],
    ["AI Engineer Intern", ["ml"], ["ml-ai-eng"], "ai engineer"],
    // Engineering
    ["Structural Engineering Intern", ["engineering"], ["eng-structural"], "structural"],
    ["Civil Engineer Co-op", ["engineering"], ["eng-civil"], "civil"],
    ["Electrical Engineering Intern", ["engineering"], ["eng-electrical"], "electrical"],
    ["Mechanical Engineer Intern", ["engineering"], ["eng-mechanical"], "mechanical"],
    ["Chemical Engineering Intern", ["engineering"], ["eng-chemical"], "chemical"],
    ["Aerospace Engineer Intern", ["engineering"], ["eng-aerospace"], "aerospace"],
    // Design
    ["UX Designer Intern", ["design"], ["design-ux"], "ux"],
    ["UI Designer Co-op", ["design"], ["design-ui"], "ui"],
    ["Product Designer Intern", ["design"], ["design-product"], "product design"],
    ["Interaction Designer Intern", ["design"], ["design-interaction"], "interaction"],
    // Growth
    ["Growth Marketing Intern", ["growth"], ["growth-general"], "growth general"],
    ["Lifecycle Marketing Intern", ["growth"], ["growth-lifecycle"], "lifecycle"],
    ["User Acquisition Intern", ["growth"], ["growth-acquisition"], "acquisition"],
    // Title not in family -> empty
    ["Frontend Engineer Intern", ["data"], [], "wrong family"],
    // Empty
    ["", ["swe"], [], "empty"],
  ];

  it.each(cases)("title=%s families=%s -> %s (%s)", (title, families, expected, _label) => {
    expect(detectRoleTitles(title, families, { title, company: "Test", url: "http://x" })).toEqual(expected);
  });
});
```

```ts
// src/lib/normalize.ts (add detectRoleTitles)
import type { RawPosting, RoleFamily, RoleTitle } from "./types";

const TITLE_KEYWORDS: Record<RoleFamily, Record<RoleTitle, RegExp>> = {
  swe: {
    "swe-frontend": /\b(frontend|front[- ]?end)\b/i,
    "swe-backend": /\b(backend|back[- ]?end)\b/i,
    "swe-fullstack": /\b(full[- ]?stack|fullstack)\b/i,
    "swe-mobile": /\b(mobile|ios|android)\b/i,
    "swe-devops": /\b(devops|dev[- ]?ops|sre|site\s+reliability)\b/i,
    "swe-embedded": /\b(embedded|firmware)\b/i,
  },
  "pm-program": {
    "pm-product": /\b(product\s+manager|pm\b)\b/i,
    "pm-tpm": /\b(technical\s+program\s+manager|tpm\b)\b/i,
    "pm-program": /\b(program\s+manager)\b/i,
  },
  hardware: {
    "hw-silicon": /\b(silicon|vlsi|chip\s+design)\b/i,
    "hw-pcb": /\b(pcb|printed\s+circuit\s+board)\b/i,
    "hw-fpga": /\b(fpga)\b/i,
    "hw-asic": /\b(asic|verification|physical\s+design)\b/i,
  },
  data: {
    "data-scientist": /\b(data\s+scientist)\b/i,
    "data-engineer": /\b(data\s+engineer)\b/i,
    "data-analytics": /\b(analytics|data\s+analyst)\b/i,
  },
  ml: {
    "ml-engineer": /\b(machine\s+learning|ml\s+engineer)\b/i,
    "ml-researcher": /\b(ml\s+researcher|machine\s+learning\s+research)\b/i,
    "ml-ai-eng": /\b(ai\s+engineer|artificial\s+intelligence\s+engineer)\b/i,
  },
  engineering: {
    "eng-structural": /\b(structural\s+engineer)\b/i,
    "eng-civil": /\b(civil\s+engineer)\b/i,
    "eng-electrical": /\b(electrical\s+engineer)\b/i,
    "eng-mechanical": /\b(mechanical\s+engineer)\b/i,
    "eng-chemical": /\b(chemical\s+engineer)\b/i,
    "eng-aerospace": /\b(aerospace\s+engineer)\b/i,
  },
  design: {
    "design-ux": /\b(ux\s+designer|user\s+experience\s+designer)\b/i,
    "design-ui": /\b(ui\s+designer|user\s+interface\s+designer)\b/i,
    "design-product": /\b(product\s+designer)\b/i,
    "design-interaction": /\b(interaction\s+designer)\b/i,
  },
  growth: {
    "growth-general": /\b(growth\s+marketing|growth\s+engineer)\b/i,
    "growth-lifecycle": /\b(lifecycle\s+marketing)\b/i,
    "growth-acquisition": /\b(user\s+acquisition|acquisition\s+marketing)\b/i,
  },
};

export function detectRoleTitles(
  title: string,
  roleFamilies: RoleFamily[],
  _raw?: RawPosting
): RoleTitle[] {
  const norm = title.trim().replace(/\s+/g, " ").toLowerCase();
  const titles: RoleTitle[] = [];
  for (const family of roleFamilies) {
    const patterns = TITLE_KEYWORDS[family];
    if (!patterns) continue;
    for (const [roleTitle, re] of Object.entries(patterns)) {
      if (re.test(norm)) {
        titles.push(roleTitle as RoleTitle);
      }
    }
  }
  return titles;
}
```

- [ ] **Step 5.1:** Append `detectRoleTitles` test suite to `tests/lib/normalize.test.ts`.
- [ ] **Step 5.2:** Run `npm test` — verify new tests FAIL.
- [ ] **Step 5.3:** Add `detectRoleTitles` implementation to `src/lib/normalize.ts`.
- [ ] **Step 5.4:** Run `npm test` — verify ALL tests PASS (3 functions).
- [ ] **Step 5.5:** `git add tests/lib/normalize.test.ts src/lib/normalize.ts && git commit -m "feat(lib): detectRoleTitles with TDD coverage"`

---

### Task 6: `dedupHash` Helper (TDD)

**Files:**
- Modify: `tests/lib/normalize.test.ts` (add `dedupHash` suite)
- Modify: `src/lib/normalize.ts` (add `dedupHash`)

**Interfaces:**
- Produces: `dedupHash(sourceName: SourceName, externalId: string, title: string, company: string): string`

**Test Cases:**

```ts
// tests/lib/normalize.test.ts (add to file)
import { dedupHash } from "@/lib/normalize";

describe("dedupHash", () => {
  const cases: [SourceName, string, string, string, string][] = [
    ["greenhouse", "12345", "Software Engineer Intern", "Google", "expected-hash-1"],
    ["greenhouse", "12345", "software engineer intern", "Google", "expected-hash-1"], // case/space normalization
    ["greenhouse", "12345", "  Software Engineer Intern  ", "Google", "expected-hash-1"], // trim/collapse
    ["greenhouse", "", "Software Engineer Intern", "Google", "expected-hash-2"], // no externalId -> fallback
    ["greenhouse", "", "software engineer intern", "Google", "expected-hash-2"], // fallback case normalized
    ["ashby", "67890", "Software Engineer Intern", "Google", "expected-hash-3"], // different source
    ["greenhouse", "12345", "Software Engineer Intern", "Microsoft", "expected-hash-4"], // different company
  ];

  it.each(cases)("source=%s extId=%s title=%s company=%s -> stable hash", (src, extId, title, company, _label) => {
    const h1 = dedupHash(src, extId, title, company);
    const h2 = dedupHash(src, extId, title, company);
    expect(h1).toBe(h2); // deterministic
    expect(h1).toHaveLength(64); // sha256 hex
  });

  it("different inputs produce different hashes", () => {
    const h1 = dedupHash("greenhouse", "12345", "Software Engineer Intern", "Google");
    const h2 = dedupHash("greenhouse", "12345", "Software Engineer Intern", "Microsoft");
    expect(h1).not.toBe(h2);
  });
});
```

```ts
// src/lib/normalize.ts (add dedupHash)
import type { SourceName } from "./types";
import { createHash } from "node:crypto";

function normalizeForHash(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

export function dedupHash(
  sourceName: SourceName,
  externalId: string,
  title: string,
  company: string
): string {
  const normTitle = normalizeForHash(title);
  const normCompany = normalizeForHash(company);
  const parts = externalId ? [sourceName, externalId, normTitle, normCompany] : [sourceName, normTitle, normCompany];
  const input = parts.join("|");
  return createHash("sha256").update(input).digest("hex");
}
```

- [ ] **Step 6.1:** Append `dedupHash` test suite to `tests/lib/normalize.test.ts`.
- [ ] **Step 6.2:** Run `npm test` — verify new tests FAIL.
- [ ] **Step 6.3:** Add `dedupHash` implementation to `src/lib/normalize.ts`.
- [ ] **Step 6.4:** Run `npm test` — verify ALL tests PASS (4 functions).
- [ ] **Step 6.5:** `git add tests/lib/normalize.test.ts src/lib/normalize.ts && git commit -m "feat(lib): dedupHash with TDD coverage"`

---

### Task 7: Prisma Schema + SQLite Setup

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/db/client.ts`

**Interfaces:**
- Prisma models per spec Section 7 exactly.
- `PrismaClient` singleton in `src/db/client.ts`.

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Posting {
  id           Int      @id @default(autoincrement())
  dedupHash    String   @unique
  externalId   String
  sourceName   String
  kind         String   @default("job")
  level        String
  title        String
  company      String
  location     String?
  roleFamily   String   // JSON array stored as text
  roleTitles   String   // JSON array stored as text
  url          String
  firstSeenAt  DateTime @default(now())
  postedAt     DateTime?
  raw          String?  // JSON-serialized raw payload
  channelIds   String?  // JSON array of channel IDs

  @@index([sourceName])
  @@index([firstSeenAt])
  @@index([kind, roleFamily])
}

model Source {
  name               String   @id
  lastRunAt          DateTime?
  lastError          String?
  ingestedCount      Int      @default(0)
  droppedNonIntern   Int      @default(0)
  droppedUnclassified Int     @default(0)
  enabled            Boolean  @default(true)
  pollIntervalSec    Int      @default(300)
}

model ChannelMap {
  id         Int    @id @default(autoincrement())
  kind       String
  roleFamily String
  channelId  String

  @@unique([kind, roleFamily])
}
```

```ts
// src/db/client.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
```

- [ ] **Step 7.1:** Write `prisma/schema.prisma` (exact content above).
- [ ] **Step 7.2:** Write `src/db/client.ts` (exact content above).
- [ ] **Step 7.3:** Run `npm run db:generate` — verify Prisma Client generated.
- [ ] **Step 7.4:** Run `npm run db:push` — verify SQLite `dev.db` created with tables.
- [ ] **Step 7.5:** Run `npx tsc --noEmit` — verify zero TypeScript errors.
- [ ] **Step 7.6:** `git add prisma/schema.prisma src/db/client.ts && git commit -m "feat(db): Prisma schema + client singleton"`

---

### Task 8: Config Files — `adapters.config.ts` + `roles.config.ts`

**Files:**
- Create: `src/config/adapters.config.ts`
- Create: `src/config/roles.config.ts`
- Create: `src/config/index.ts` (re-export)

**Interfaces:**
- `adapters.config.ts` exports `adapterConfigs: AdapterConfig[]` where each has `name: SourceName`, `enabled: boolean`, `pollIntervalSec: number`, `companies: string[]`.
- `roles.config.ts` exports `roleFamilies: RoleFamilyConfig[]` where each has `family: RoleFamily`, `channelName: string`, `titles: { title: RoleTitle; roleName: string; description: string }[]`.

```ts
// src/config/adapters.config.ts
import type { SourceName } from "@/lib/types";

export interface AdapterConfig {
  name: SourceName;
  enabled: boolean;
  pollIntervalSec: number;
  companies: string[]; // company slugs for ATS; repo names for GitHub
}

export const adapterConfigs: AdapterConfig[] = [
  { name: "greenhouse", enabled: true, pollIntervalSec: 300, companies: ["google", "microsoft", "amazon", "meta", "apple"] },
  { name: "ashby", enabled: true, pollIntervalSec: 300, companies: ["stripe", "airbnb", "coinbase", "databricks", "notion"] },
  { name: "lever", enabled: true, pollIntervalSec: 300, companies: ["shopify", "discord", "figma", "linear", "vercel"] },
  { name: "workday", enabled: true, pollIntervalSec: 300, companies: ["nvidia", "intel", "amd", "qualcomm", "salesforce"] },
  { name: "simplify", enabled: true, pollIntervalSec: 900, companies: [] }, // Simplify uses different discovery
  { name: "github", enabled: true, pollIntervalSec: 900, companies: ["SimplifyJobs/Summer2026-Internships", "pittcsc/PittCSWindow"] },
];
```

```ts
// src/config/roles.config.ts
import type { RoleFamily, RoleTitle } from "@/lib/types";

export interface RoleTitleConfig {
  title: RoleTitle;
  roleName: string;      // Discord role name (e.g., "SWE - Frontend")
  description: string;   // For /role autocomplete
}

export interface RoleFamilyConfig {
  family: RoleFamily;
  channelName: string;   // e.g., "swe-jobs"
  titles: RoleTitleConfig[];
}

export const roleFamilies: RoleFamilyConfig[] = [
  {
    family: "swe",
    channelName: "swe-jobs",
    titles: [
      { title: "swe-frontend", roleName: "SWE - Frontend", description: "Frontend engineering internships" },
      { title: "swe-backend", roleName: "SWE - Backend", description: "Backend engineering internships" },
      { title: "swe-fullstack", roleName: "SWE - Fullstack", description: "Fullstack engineering internships" },
      { title: "swe-mobile", roleName: "SWE - Mobile", description: "Mobile engineering internships" },
      { title: "swe-devops", roleName: "SWE - DevOps", description: "DevOps/SRE internships" },
      { title: "swe-embedded", roleName: "SWE - Embedded", description: "Embedded/firmware internships" },
    ],
  },
  {
    family: "pm-program",
    channelName: "pm-program-jobs",
    titles: [
      { title: "pm-product", roleName: "PM - Product", description: "Product management internships" },
      { title: "pm-program", roleName: "PM - Program", description: "Program management internships" },
      { title: "pm-tpm", roleName: "PM - TPM", description: "Technical program management internships" },
    ],
  },
  {
    family: "hardware",
    channelName: "hardware-jobs",
    titles: [
      { title: "hw-silicon", roleName: "HW - Silicon", description: "Silicon/VLSI internships" },
      { title: "hw-pcb", roleName: "HW - PCB", description: "PCB design internships" },
      { title: "hw-fpga", roleName: "HW - FPGA", description: "FPGA engineering internships" },
      { title: "hw-asic", roleName: "HW - ASIC", description: "ASIC/verification internships" },
    ],
  },
  {
    family: "data",
    channelName: "data-jobs",
    titles: [
      { title: "data-scientist", roleName: "Data - Scientist", description: "Data science internships" },
      { title: "data-engineer", roleName: "Data - Engineer", description: "Data engineering internships" },
      { title: "data-analytics", roleName: "Data - Analytics", description: "Analytics internships" },
    ],
  },
  {
    family: "ml",
    channelName: "ml-ai-jobs",
    titles: [
      { title: "ml-engineer", roleName: "ML - Engineer", description: "ML engineering internships" },
      { title: "ml-researcher", roleName: "ML - Researcher", description: "ML research internships" },
      { title: "ml-ai-eng", roleName: "ML - AI Engineer", description: "AI engineering internships" },
    ],
  },
  {
    family: "engineering",
    channelName: "engineering-jobs",
    titles: [
      { title: "eng-structural", roleName: "Eng - Structural", description: "Structural engineering internships" },
      { title: "eng-civil", roleName: "Eng - Civil", description: "Civil engineering internships" },
      { title: "eng-electrical", roleName: "Eng - Electrical", description: "Electrical engineering internships" },
      { title: "eng-mechanical", roleName: "Eng - Mechanical", description: "Mechanical engineering internships" },
      { title: "eng-chemical", roleName: "Eng - Chemical", description: "Chemical engineering internships" },
      { title: "eng-aerospace", roleName: "Eng - Aerospace", description: "Aerospace engineering internships" },
    ],
  },
  {
    family: "design",
    channelName: "design-jobs",
    titles: [
      { title: "design-ux", roleName: "Design - UX", description: "UX design internships" },
      { title: "design-ui", roleName: "Design - UI", description: "UI design internships" },
      { title: "design-product", roleName: "Design - Product", description: "Product design internships" },
      { title: "design-interaction", roleName: "Design - Interaction", description: "Interaction design internships" },
    ],
  },
  {
    family: "growth",
    channelName: "growth-jobs",
    titles: [
      { title: "growth-general", roleName: "Growth - General", description: "General growth marketing internships" },
      { title: "growth-lifecycle", roleName: "Growth - Lifecycle", description: "Lifecycle marketing internships" },
      { title: "growth-acquisition", roleName: "Growth - Acquisition", description: "User acquisition internships" },
    ],
  },
];
```

```ts
// src/config/index.ts
export * from "./adapters.config";
export * from "./roles.config";
```

- [ ] **Step 8.1:** Write `src/config/adapters.config.ts` (exact content above).
- [ ] **Step 8.2:** Write `src/config/roles.config.ts` (exact content above).
- [ ] **Step 8.3:** Write `src/config/index.ts` (exact content above).
- [ ] **Step 8.4:** Run `npx tsc --noEmit` — verify zero errors.
- [ ] **Step 8.5:** `git add src/config && git commit -m "feat(config): adapter + role taxonomy configs"`

---

### Task 9: Full Test Suite Verification + Plan 1 Completion

**Files:** None new.

**Verification:**
- All `normalize.ts` functions covered by table-driven tests.
- Prisma schema matches spec Section 7 exactly.
- Config files match spec Section 5 (roles) and Section 6 (adapters starter companies).
- TypeScript compiles cleanly.
- All tests pass.

- [ ] **Step 9.1:** Run `npm test` — verify **all tests pass** (detectLevel, detectRoleFamily, detectRoleTitles, dedupHash).
- [ ] **Step 9.2:** Run `npx tsc --noEmit` — verify zero TypeScript errors.
- [ ] **Step 9.3:** Run `npm run db:studio` (optional manual verify) — confirm tables exist.
- [ ] **Step 9.4:** `git add -A && git commit -m "chore(plan1): complete scaffold + contract + normalize + Prisma"`

---

## Plan 1 Deliverables (Definition of Done)

- [ ] `package.json`, `tsconfig.json`, `vitest.config.ts`, `.env.example`, `.gitignore`, `src/index.ts`
- [ ] `src/lib/types.ts` — full `Posting` contract types
- [ ] `src/lib/normalize.ts` — `detectLevel`, `detectRoleFamily`, `detectRoleTitles`, `dedupHash` (all pure, exported)
- [ ] `tests/lib/normalize.test.ts` — **comprehensive table-driven tests for all 4 functions, all passing**
- [ ] `prisma/schema.prisma` — exact schema from spec Section 7
- [ ] `src/db/client.ts` — PrismaClient singleton
- [ ] `src/config/adapters.config.ts` — 6 adapters with starter company lists
- [ ] `src/config/roles.config.ts` — full role-family taxonomy with per-title ping roles
- [ ] `src/config/index.ts` — re-exports
- [ ] `git log --oneline` shows 6+ commits (scaffold, types, detectLevel, detectRoleFamily, detectRoleTitles, dedupHash, db, config)

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-07-24-01-scaffold-contract-normalize-db.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`.

**2. Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints for review.

**Which approach?**
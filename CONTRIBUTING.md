# Contributing

## Setup

```bash
cp .env.example .env
# Set DISCORD_TOKEN. GITHUB_TOKEN is optional but recommended.
npm ci
npx prisma migrate deploy
npm test
```

Node.js 20+ is required (see `.nvmrc`).

## Add a company board

Edit `src/config/adapters.config.ts`. That file is the default board list, not a secret.

- **Greenhouse** — add the board slug from `https://boards.greenhouse.io/{slug}` (or `job-boards.greenhouse.io/{slug}`) to `greenhouse.companies`.
- **Ashby** — add the job-board slug from `https://jobs.ashbyhq.com/{slug}` to `ashby.companies`.
- **Lever** — add the slug from `https://jobs.lever.co/{slug}` to `lever.companies`.
- **Workday** — add a short name to `workday.companies` **and** a matching `workdayBoards` entry (`host`, `tenant`, `site` from the public career-site URL).
- **GitHub intern lists** — add `owner/repo` or `owner/repo#path.md` to `github.companies`.

Keep `enabled: true` only for adapters you actually poll. Run the existing adapter tests if you touch fetch/parse code:

```bash
npm test
```

## Add or change ping families

Edit `src/config/roles.config.ts` (channel name, emoji, Discord role name). `/onboard` and boot-time provisioning read this file.

## Pull requests

- Keep changes focused.
- Add or update tests next to the behavior you change (`tests/`).
- Do not commit `.env`, `*.db`, `dist/`, or `node_modules/`.

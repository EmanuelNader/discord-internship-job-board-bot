# Deploy Runbook

Short path to run the internship job board bot locally or on a VPS with PM2.

## Prerequisites

- **Node.js 20+**
- Discord bot application + token (use a **separate** app for prod vs local)
- Bot invited to the target guild with:
  - Manage Channels
  - Manage Roles
  - Send Messages
  - Embed Links
  - Use Application Commands

## Local development

```bash
cp .env.example .env
# Fill DISCORD_TOKEN, DATABASE_URL (default file:./dev.db), optional GITHUB_TOKEN
# Keep BACKFILL=false unless you intentionally want first-boot channel seeding

npm ci
npx prisma migrate deploy
npm test && npm run build
npm run dev
```

## VPS (PM2)

```bash
git clone <repo-url> && cd discord-internship-job-board-bot
npm ci
npx prisma migrate deploy
npm run build
```

Create `.env` on the host (never commit it):

```env
DISCORD_TOKEN=your_prod_bot_token
DATABASE_URL="file:./prod.db"
GITHUB_TOKEN=optional_github_pat
BACKFILL=true
BACKFILL_LIMIT=50
NODE_ENV=production
```

Use `BACKFILL=true` **only on first boot** so empty channels get seeded posts. Secrets are loaded by the app via `dotenv` from `.env` in the project cwd (PM2 does not hardcode tokens in `ecosystem.config.cjs`).

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # follow the printed command to enable boot persistence
pm2 logs intern-board
```

## First-boot Discord smoke

1. Invite the bot → confirm it comes online (`pm2 logs` / Discord member list).
2. Run `/setup` in the guild.
3. Verify **8 channels** plus ping roles / ChannelMap wiring.
4. With `BACKFILL=true`, confirm job embeds appear in channels (sends are rate-limited ~1 / 2s).
5. Set `BACKFILL=false` in `.env`, then `pm2 restart intern-board`.
6. Exercise `/status`, `/ping`, `/role`, `/unrole`.
7. Wait one scheduler poll cycle — same jobs must **not** duplicate.

## Ops notes

- Keep **separate Discord applications** (and tokens) for production vs local/dev.
- If a token leaks, rotate it in the Discord Developer Portal and update `.env` + restart PM2.
- Back up SQLite regularly, e.g. `mkdir -p backups && cp prod.db "backups/prod-$(date +%Y%m%d-%H%M%S).db"`.

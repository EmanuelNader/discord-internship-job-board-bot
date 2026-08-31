# Deploy Runbook

Short path to run the internship job board bot locally or on a VPS with PM2.

## Prerequisites

- **Node.js 20+** (do not run `npm ci --omit=dev` — the host compiles TypeScript)
- Discord bot application + token (use a **separate** app for prod vs local)
- Invite the bot **before** starting it. Slash commands and channel setup need a guild.

Replace `CLIENT_ID` with the Application ID from the Discord Developer Portal:

```text
https://discord.com/oauth2/authorize?client_id=CLIENT_ID&permissions=2416004176&scope=bot%20applications.commands
```

That grant is: View Channels, Manage Channels, Manage Roles, Send Messages, Embed Links, Add Reactions, Read Message History, Use Application Commands.

Put the bot’s role **above** the ping roles it creates, or reaction-role assignment fails.

No privileged Gateway Intents are required.

## Local development

```bash
cp .env.example .env
# Fill DISCORD_TOKEN. GITHUB_TOKEN is strongly recommended (GitHub rate limits).
# DATABASE_URL file:./dev.db is created at prisma/dev.db (relative to the Prisma schema).
# Keep BACKFILL=false unless you intentionally want first-boot channel seeding.

npm ci
npx prisma migrate deploy
npm test && npm run build
npm run dev
```

## VPS (PM2)

Invite the bot to the guild first. Then:

```bash
git clone https://github.com/EmanuelNader/discord-internship-job-board-bot.git
cd discord-internship-job-board-bot
git checkout main
npm ci
npx prisma migrate deploy
npm run build
```

Create `.env` on the host (never commit it):

```env
DISCORD_TOKEN=your_prod_bot_token
DATABASE_URL="file:./prod.db"
GITHUB_TOKEN=your_github_pat
BACKFILL=true
BACKFILL_LIMIT=50
GITHUB_MAX_AGE_DAYS=14
```

`DATABASE_URL="file:./prod.db"` is stored at **`prisma/prod.db`**, not the repo root.

Use `BACKFILL=true` **only on first boot** so empty channels get seeded posts. Secrets are loaded by the app via `dotenv` from `.env` in the project cwd (PM2 sets `NODE_ENV=production` in `ecosystem.config.cjs` — do not export `NODE_ENV=production` before `npm ci`).

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # follow the printed command to enable boot persistence
pm2 logs intern-board
```

You should see `Logged in as ...`, `Deployed … slash commands`, and `SourcesManager started`. If you see `Bot is not in any guild`, the invite did not complete — fix that and `pm2 restart intern-board`.

## First-boot Discord smoke

1. Confirm the bot is online (`pm2 logs` / Discord member list).
2. In the welcome channel, run **`/onboard`** (Administrator). This creates the 8 job channels + ping roles if missing, posts the welcome embed, and adds family emoji reactions.
3. React to an emoji and confirm you received the family ping roles.
4. With `BACKFILL=true`, confirm job embeds appear in channels (sends are rate-limited ~1 / 2s).
5. Set `BACKFILL=false` in `.env`, then `pm2 restart intern-board`.
6. Exercise `/status`, `/ping`, `/role`, `/unrole`.
7. Wait one scheduler poll cycle — same jobs must **not** duplicate.

## Ops notes

- Keep **separate Discord applications** (and tokens) for production vs local/dev.
- If a token leaks, rotate it in the Discord Developer Portal and update `.env` + restart PM2.
- Back up SQLite from the schema directory: `mkdir -p backups && cp prisma/prod.db "backups/prod-$(date +%Y%m%d-%H%M%S).db"`.
- After pulling new commits: `git pull && npm ci && npx prisma migrate deploy && npm run build && pm2 restart intern-board`.
- This process only configures the first guild the bot is in.

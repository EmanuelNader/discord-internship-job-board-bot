# Engineering Internship Job Board Bot

Self-hosted Discord bot that watches public intern lists and company career pages, keeps **US intern / co-op / fellowship** roles, and posts each new listing into a role-family channel (SWE, PM, Hardware, Data, ML, Engineering, Design, Growth). Members react on the `/onboard` panel (or use `/role`) to get pinged.

This is **not** a public bot you invite from a directory. Clone the repo, create your own Discord application, and run it on a machine that stays on.

It only uses the **first Discord server** the bot is in. If you add it to a second guild, that guild is ignored.

## What you need

- Node.js 20+ (or Docker)
- A Discord application + bot token
- A GitHub personal access token (optional, strongly recommended — public GitHub API rate limits)

Invite URL (replace `CLIENT_ID` with the Application ID):

```text
https://discord.com/oauth2/authorize?client_id=CLIENT_ID&permissions=2416004176&scope=bot%20applications.commands
```

That grant is: View Channels, Manage Channels, Manage Roles, Send Messages, Embed Links, Add Reactions, Read Message History, Use Application Commands.

Put the bot’s role **above** the ping roles it creates, or reaction-role assignment fails. No privileged Gateway Intents are required.

## Quick start (Docker)

Full runbook: **[docs/DEPLOY.md](docs/DEPLOY.md)**.

```bash
cp .env.example .env
# Set DISCORD_TOKEN. Set GITHUB_TOKEN if you have one.
docker compose up -d --build
```

Invite the bot **before** the first start. In a server text channel, run **`/onboard`** (Administrator). That creates the job channels and ping roles if missing, posts the welcome embed, and adds family emoji reactions.

Use `BACKFILL=true` only on first boot if you want a seed of recent listings, then set it back to `false` and restart. Compose stores SQLite in the `intern-board-data` volume — do not point `DATABASE_URL` at your laptop `prisma/dev.db`.

## Local development

```bash
cp .env.example .env
npm ci
npx prisma migrate deploy
npm test && npm run build
npm run dev
```

`.env.example` documents every variable. Never commit `.env`.

## Commands

| Command | Who | What |
| --- | --- | --- |
| `/onboard` | Admin | Create channels/roles, post the reaction-role panel |
| `/role` `/unrole` | Anyone | Join or leave a family ping role |
| `/status` | Anyone | Adapter health |
| `/ping` | Anyone | Liveness |
| `/setup` `/linkchannel` | Admin | Repair provisioning / remap a channel |

## Config

- Board list: `src/config/adapters.config.ts` (Greenhouse, Ashby, Lever, Workday, GitHub intern READMEs)
- Channels and ping roles: `src/config/roles.config.ts`

See [CONTRIBUTING.md](CONTRIBUTING.md) to add a company. Report vulnerabilities via [SECURITY.md](SECURITY.md) — never paste tokens in issues.

## License

MIT. See [LICENSE](LICENSE).

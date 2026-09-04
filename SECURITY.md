# Security

## Reporting a vulnerability

Do **not** open a public GitHub issue for a security problem.

Use GitHub’s private advisory form:

https://github.com/EmanuelNader/discord-internship-job-board-bot/security/advisories/new

Include enough detail to reproduce the issue. You should get a response within a few days.

## Secrets

Never paste `DISCORD_TOKEN`, `GITHUB_TOKEN`, `.env` contents, database files, or Discord message dumps that might include tokens into issues, pull requests, or logs.

Each deployment needs its **own** Discord application. If a token leaks, rotate it in the [Discord Developer Portal](https://discord.com/developers/applications) and restart the bot.

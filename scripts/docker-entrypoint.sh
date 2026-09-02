#!/bin/sh
set -e
mkdir -p /app/data
npx prisma migrate deploy
exec node dist/index.js

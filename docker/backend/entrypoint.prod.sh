#!/bin/sh
set -eu

if [ "${SKIP_PRISMA_MIGRATE:-false}" != "true" ]; then
  npx prisma migrate deploy --schema /app/database/prisma/schema.prisma
fi

exec node dist/server.js

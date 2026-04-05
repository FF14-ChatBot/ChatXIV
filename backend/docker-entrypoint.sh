#!/bin/sh
set -e
# Named volumes are often root-owned; the app runs as user `node` and must write SQLite under ./data (WORKDIR is /app/backend).
if [ "$(id -u)" = '0' ]; then
  mkdir -p "./data"
  chown -R node:node "./data"
  exec su-exec node "$0" "$@"
fi
exec "$@"

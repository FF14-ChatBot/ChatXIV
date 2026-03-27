#!/bin/sh
set -e
# Named volumes are often root-owned; the app runs as user `node` and must write SQLite under DATA_DIR.
if [ "$(id -u)" = '0' ]; then
  mkdir -p "$DATA_DIR"
  chown -R node:node "$DATA_DIR"
  exec su-exec node "$0" "$@"
fi
exec "$@"

# Build from repository root (needs @chatxiv/cdm + root lockfile):
#   docker build -f backend/Dockerfile -t chatxiv-backend .
#
# Run (example): map a persistent directory for SQLite (app uses ./data under WORKDIR):
#   docker run --rm -p 3000:3000 -v chatxiv-data:/app/backend/data chatxiv-backend
#
# Layering: install deps using only package.json files first so `npm ci` stays cached when you
# change backend source or docker-entrypoint (runner copies entrypoint from context, not here).

# syntax=docker/dockerfile:1

FROM node:24-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app

ENV HUSKY=0

COPY package.json package-lock.json ./
COPY packages/cdm/package.json ./packages/cdm/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Skip lifecycle scripts: root `prepare` runs repo Husky setup, and `scripts/` is not copied into the image.
# better-sqlite3 still needs its native binding — compile it explicitly after install.
RUN npm ci -w @chatxiv/cdm -w chatxiv-backend --ignore-scripts \
 && npm rebuild better-sqlite3

COPY packages/cdm ./packages/cdm
COPY backend/tsconfig.json ./backend/
COPY backend/scripts ./backend/scripts
COPY backend/openapi ./backend/openapi
COPY backend/src ./backend/src

RUN npm run build --workspace=@chatxiv/cdm \
 && npm run build --workspace=chatxiv-backend

# Drop devDependencies: fresh prod-only install is often faster than `npm prune` on a huge tree.
RUN rm -rf node_modules backend/node_modules packages/cdm/node_modules \
 && npm ci -w @chatxiv/cdm -w chatxiv-backend --omit=dev --ignore-scripts \
 && npm rebuild better-sqlite3

# ── Runtime ───────────────────────────────────────────────────────────

FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN apk add --no-cache wget su-exec

COPY backend/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/packages/cdm ./packages/cdm
COPY --from=builder --chown=node:node /app/backend/package.json ./backend/package.json
# Workspace deps (e.g. dotenv) often live under backend/node_modules per lockfile — not only the repo root.
COPY --from=builder --chown=node:node /app/backend/node_modules ./backend/node_modules
COPY --from=builder --chown=node:node /app/backend/openapi ./backend/openapi
COPY --from=builder --chown=node:node /app/backend/dist ./backend/dist

WORKDIR /app/backend

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health > /dev/null || exit 1

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]

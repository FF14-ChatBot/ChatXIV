---
name: run-locally
description: >-
  Start the ChatXIV backend and frontend locally so a change can be manually
  tested (health check, Swagger UI, chat UI, or a specific client like
  MediaWiki/XIVAPI). Use when asked to run, start, or manually verify the app
  locally.
---

# Run ChatXIV locally

## Prerequisites

- Node 24+, npm; root `npm install` already run (workspaces: `backend/`, `frontend/`, `packages/*`).
- `backend/.env` exists (copy from `backend/.env.example`). Minimum: `PORT=3000`.
  - `ANTHROPIC_API_KEY` is only required for chat routes that call the LLM — not needed to exercise the MediaWiki or XIVAPI clients directly.
  - Optional: Redis for cache parity — `docker run --rm -p 6379:6379 redis:7-alpine`, then `CACHE_BACKEND=redis` + `REDIS_URL=redis://localhost:6379`. If skipped, leave `REDIS_REQUIRED=false` (default) — the process still starts and `/health/cache` returns 503 until Redis is up.
  - Optional: set `MEDIAWIKI_USER_AGENT` for MediaWiki client testing — unset falls back to a placeholder that wikis may rate-limit or block.
- `frontend/.env` with `VITE_CHATXIV_BACKEND_URL` if testing the frontend against a non-default backend URL.

## Start

From the repo root, in two separate terminals:

```bash
npm run dev:backend    # Express API, tsx watch, http://localhost:3000
npm run dev:frontend   # React + Vite, http://localhost:5173
```

Backend restarts automatically on `backend/src/` changes (`tsx watch`). Frontend hot-reloads `frontend/src/` via Vite; restart the dev server yourself after `vite.config.ts` or `scripts/dev.mjs` changes.

## Verify it's up

- Health check: `curl http://localhost:3000/health`
- Public Swagger UI (manually exercise any route, including ones that call MediaWiki/XIVAPI): `http://localhost:3000/v1/docs/`
- Public OpenAPI YAML: `http://localhost:3000/v1/openapi.yaml`
- Frontend: open `http://localhost:5173` in a browser

Admin Swagger UI (`/v1/admin/docs/`) requires an admin OIDC session cookie — skip it unless the task specifically involves admin routes.

## Stopping

Ctrl+C in each terminal. If port 5173 stays busy after a restart, stop the other process holding it before retrying — the dev server only retries binding briefly.

## More detail

Full setup, Docker, Cloudflare tunnels, and troubleshooting: `docs/README.md`.

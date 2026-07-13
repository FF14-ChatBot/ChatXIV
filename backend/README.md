# ChatXIV backend

Express + TypeScript API. Run `npm run dev` from this package (or `npm run dev:backend` from the repo root). Default base URL: `http://localhost:3000`.

### Optional: Grafana Cloud Loki (log shipping)

When **`LOKI_HOST`**, **`LOKI_USER_ID`** (Grafana Cloud numeric id as a string), and **`LOKI_PASSWORD`** are all set (see [`.env.example`](.env.example)), the process still logs JSON to **stdout** and also **pushes** the same lines to Grafana Cloud Loki via HTTP (`pino-loki`). Omit any variable (or all three) to disable shipping.

**Where to get `LOKI_HOST`, `LOKI_USER_ID`, and `LOKI_PASSWORD`**

Your Loki URL and credentials live in the **Grafana Cloud** portal (e.g. [grafana.com/profile/org](https://grafana.com/profile/org)).

1. Sign in at [grafana.com](https://grafana.com) and open **My Account**.
2. Under your stack, open **Details** or **Send logs**.
3. In the **Loki** section, copy:
   - **URL** → set as **`LOKI_HOST`** (e.g. `https://logs-prod-XXX.grafana.net`).
   - **User** (numeric id, e.g. `123456`) → set as **`LOKI_USER_ID`**.
   - **Password** → a **Cloud Access Policy** token whose policy includes the **`logs:write`** scope for this stack (see [Using an access policy token](https://grafana.com/docs/grafana-cloud/security-and-account-management/authentication-and-permissions/access-policies/using-an-access-policy-token/)). Tokens minted only for other products (e.g. OTLP-only or Grafana UI) often lack Loki write and will fail.

You can also open your hosted Grafana instance (**Connections** → **Add new connection** → search **Loki**): the setup flow shows the **write** endpoint and auth details.

**Note:** The Loki hostname (`logs-prod-…grafana.net`) is **not** the same as your Grafana instance URL (e.g. `yourstack.grafana.net`). Use the Loki URL from the portal for **`LOKI_HOST`**.

**If push fails with `authentication error: invalid scope requested`:** `LOKI_PASSWORD` is not a Loki-capable token. In Grafana Cloud, create or edit a **Cloud Access Policy** for this stack, add the **`logs:write`** scope, create a new token from that policy, and set it as **`LOKI_PASSWORD`**. See [Cloud Access Policies](https://grafana.com/docs/grafana-cloud/security-and-account-management/authentication-and-permissions/access-policies/).

## Docker

**Prerequisites:** Install and start **Docker Desktop** (Windows/macOS) or **Docker Engine** (Linux). On Windows, use the **WSL 2–based Linux engine** so Linux images can run. See **[Docker Desktop and Linux engine](../docs/README.md#docker-desktop-and-linux-engine-optional)** in the developer setup guide.

The Dockerfile **caches `npm ci`** when only backend **source** (or the entrypoint script) changes: dependency install is keyed off workspace `package.json` files, not the full `backend/` tree. The build still runs a second **production-only `npm ci`** after TypeScript compiles so the image stays smaller—expect that step to take some time on a cold cache.

You do **not** need to run `npm install` or `npm run build` on the host first; **`docker build` runs the full compile inside the image.**

From the **repository root**, npm shortcuts (image tag **`chatxiv-backend:local`**):

```bash
npm run docker:build:backend
# Requires backend/.env (create from backend/.env.example). Persists SQLite in Docker volume chatxiv-data.
npm run docker:run:backend
```

Equivalent raw Docker:

```bash
docker build -f backend/Dockerfile -t chatxiv-backend:local .
docker run --rm -p 3000:3000 -v chatxiv-data:/app/backend/data --env-file backend/.env chatxiv-backend:local
```

Pass secrets and config with **`backend/.env`** via `--env-file` (never bake real values into the image). Defaults: `PORT=3000`, `NODE_ENV=production` inside the container. The image **entrypoint** fixes ownership on **`./data`** (under **`WORKDIR` `/app/backend`**) so the non-root `node` user can create `app.db`. To change ports or other run options, use the raw `docker run` line above and edit the flags.

### Inspecting SQLite and bootstrapping admin (OIDC)

The app stores data in **`./data/app.db`** relative to the process working directory (see **`APP_DATA_DIRECTORY`** in `backend/src/lib/config/constants.ts`). In the container, **`WORKDIR`** is **`/app/backend`**, so the file is **`/app/backend/data/app.db`**. The root npm script **`docker:run:backend`** attaches a named volume **`chatxiv-data`** at **`/app/backend/data`**, so the database survives container restarts.

**Simplest — copy `app.db` to your machine and open it in a desktop SQLite app** (e.g. [DB Browser for SQLite](https://sqlitebrowser.org/)): run queries with no shell quoting issues and a clear grid view of `users.sub`, `users.is_admin`, etc.

```bash
# While the backend container is running, replace CONTAINER with its ID or name (`docker ps`).
docker cp CONTAINER:/app/backend/data/app.db ./chatxiv-app.db
```

After editing the file locally, copy it back only if you know what you are doing (stop the backend first to avoid corruption). Prefer updating **`BOOTSTRAP_ADMIN_SUBS`** and restarting, or running SQL against the volume as below, instead of round-tripping the file.

**Optional — query in place without copying:** mount the **same volume** in a one-off Alpine container with the SQLite CLI:

```bash
# List OIDC subjects and admin flag (read-only; usually fine while the API is running)
docker run --rm -v chatxiv-data:/app/backend/data alpine:3.20 sh -c \
  "apk add --no-cache sqlite >/dev/null && sqlite3 /app/backend/data/app.db \"SELECT sub, iss, email, is_admin FROM users;\""
```

To **promote a user to admin** by `sub` (after at least one successful login so a row exists):

```bash
# Safer: stop the backend container first so nothing else writes during the update
docker run --rm -v chatxiv-data:/app/backend/data alpine:3.20 sh -c \
  "apk add --no-cache sqlite >/dev/null && sqlite3 /app/backend/data/app.db \"UPDATE users SET is_admin = 1 WHERE sub = 'YOUR_SUB_HERE';\""
```

Then restart the API if you stopped it. Ask the user to **log out and log in again** (or clear the session cookie) so the browser picks up `isAdmin` from `GET /v1/auth/me`.

On **Windows PowerShell**, if the `docker run ... sqlite3` one-liner is awkward, use **`docker cp`** + DB Browser, or run the Alpine command from **WSL** / **Git Bash**.

**Env-based bootstrap (no SQL):** set **`BOOTSTRAP_ADMIN_SUBS`** in `backend/.env` to a comma-separated list of **`sub`** values (from the DB or your IdP). On **each process startup**, the backend promotes matching rows (`UPDATE ... WHERE sub = ?`). A user must exist first, so typical flow is: log in once → set `BOOTSTRAP_ADMIN_SUBS` → restart the container → optional: remove the variable after promotion. All env keys: [`.env.example`](.env.example).

## Cache (Redis)

External API responses (XIVAPI, MediaWiki, etc.) will be cached through a **`CacheClient`** abstraction (`backend/src/lib/cache/`). The server registers the client in DI via `initializeCache()` (not in `register()`). Tests use `tests/mocks/cacheClient.mock.ts`. Configuration:

| Variable         | Default | Purpose                                                                            |
| ---------------- | ------- | ---------------------------------------------------------------------------------- |
| `CACHE_BACKEND`  | `redis` | `redis`, `memory`, or `auto` (Redis when `REDIS_URL` is set, else in-memory)       |
| `REDIS_URL`      | see env | e.g. `redis://localhost:6379` — required for local dev parity (see `.env.example`) |
| `REDIS_REQUIRED` | `false` | When `true`, startup exits if Redis is configured but `PING` fails at boot         |

**Local dev:** run Redis before the API — `docker run --rm -p 6379:6379 redis:7-alpine` — and copy cache vars from [`.env.example`](.env.example). With `REDIS_REQUIRED=false`, the process still starts if Redis is down; `GET /health/cache` returns **503** until the store is healthy.

**Health:** `GET /health` is always OK. `GET /health/cache` returns **503** when the active backend is Redis and the store is unhealthy (so load balancers can drain traffic before origin APIs are hammered).

**Consumers:** use `get()` → `hit` / `miss` / `unavailable`. On `unavailable`, call `throwIfCacheUnavailable(result, { dataSource: 'XIVAPI' })` or `requireCacheHealthy({ dataSource: '…' })` so the API returns **503** `SOURCE_UNAVAILABLE` with a message naming the origin and the cache failure reason, instead of calling upstream APIs.

**TTL:** `set()` always takes `ttlSeconds` — there is no client default; each upstream (XIVAPI, MediaWiki, etc.) picks cache lifetime for its responses. `setNx()` is for coalescing / in-flight fetch locks: production call sites must pass a short TTL (typically upstream timeout + margin, often 15–60s) so a crashed worker cannot leave a lock forever. Do not omit `setNx` TTL for request-scoped aggregation locks.

## MediaWiki client

`backend/src/lib/mediawiki/` (`MediaWikiHttpClient`) queries the MediaWiki Action API (`action=query`, `action=parse`) for ConsoleGamesWiki and the Fandom FFXIV wiki. One client instance serves both wikis — `wikiId` (`consolegameswiki` | `fandom_ffxiv`) selects the base URL and rate limiter. Retry/backoff on 429/5xx is inherited from `RetryingHttpClient` (same as XIVAPI); caching is a separate layer above this client. Configuration:

| Variable                          | Default                                                | Purpose                                                                                                                                   |
| --------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `MEDIAWIKI_USER_AGENT`            | placeholder (`ChatXIV/1.0 (unconfigured-contact)`)     | Required by wiki policy; set to `AppName/Version (contact)` — an unconfigured value may get requests blocked or rate-limited by the wiki. |
| `MEDIAWIKI_TIMEOUT_MS`            | `5000`                                                 | Per-attempt abort timeout.                                                                                                                |
| `MEDIAWIKI_RATE_LIMIT_PER_SECOND` | `1`                                                    | Token-bucket rate, applied **per wiki** (not global), so one slow wiki can't starve requests to the other.                                |
| `MEDIAWIKI_CGW_URL`               | `https://ffxiv.consolegameswiki.com/mediawiki/api.php` | Override for testing or an alternate endpoint.                                                                                            |
| `MEDIAWIKI_FANDOM_FFXIV_URL`      | `https://finalfantasy.fandom.com/api.php`              | Override for testing or an alternate endpoint.                                                                                            |

All five are optional — unset values fall back to the defaults above (see `MEDIAWIKI_DEFAULT_*` in `backend/src/lib/config/constants.ts`). Copy from [`.env.example`](.env.example) to set them locally.

## API documentation (OpenAPI + Swagger UI)

| What                    | URL                                                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Public Swagger UI**   | `http://localhost:3000/v1/docs/` (trailing slash avoids a redirect)                                                         |
| **Admin Swagger UI**    | `http://localhost:3000/v1/admin/docs/` — requires an **admin** OAuth session (signed session cookie; see below)             |
| **Public OpenAPI YAML** | `http://localhost:3000/v1/openapi.yaml` — public routes only (no `/v1/admin/*`)                                             |
| **Full OpenAPI YAML**   | `http://localhost:3000/v1/admin/openapi.yaml` — same as repo `openapi.admin.yaml`; same session auth as other `/v1/admin/*` |

Repo sources: [`openapi/openapi.public.yaml`](openapi/openapi.public.yaml) and [`openapi/openapi.admin.yaml`](openapi/openapi.admin.yaml). Update the file that matches the surface you changed (public vs admin), in the same PR as the code.

**Production:** `NODE_ENV=production` does **not** mount public `/v1/docs` or `GET /v1/openapi.yaml` (reduces public API catalog). **Development / test:** public Swagger and YAML stay available. Admin docs (`/v1/admin/docs`) are unchanged.

After `npm run build`, both YAML files are copied to `dist/openapi/` so non-production `npm start` and admin specs still serve from disk.

### Admin Swagger in the browser

`/v1/admin/docs/` uses the same auth as the rest of **`/v1/admin/*`**: a valid **signed session cookie** for a user whose **`users.is_admin`** row is set in SQLite. Log in through **`/v1/auth/login`** in the same browser profile (same site as the API, or a setup where the cookie is sent to the API origin). You get **401** if you are not logged in, **403** if logged in but not admin. The admin spec is **inlined** in the Swagger page so the UI does not need a second fetch for the YAML.

**`FORBIDDEN` — “Origin not allowed for this request”** on **Try it out** (POST/PUT/DELETE): the browser sends **`Origin`**. The mutation guard allows it if it matches the **CORS allowlist** (see [`cors.ts`](src/lib/config/cors.ts)) **or** if it equals this server’s **public origin** (`X-Forwarded-Host` first hop when present, else `Host`, with `req.protocol` / `X-Forwarded-Proto` via `trust proxy`). So Swagger on the **same URL you use for the API** works even when **`CORS_ORIGIN` replaces defaults** and omits that origin. If you still see 403, check that your proxy sets **`X-Forwarded-Proto`** and **`Host` or `X-Forwarded-Host`** consistently with the browser’s address bar.

## Common headers

| Header                                            | When                                                                                             |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `Content-Type: application/json`                  | Requests with a JSON body (`PUT /v1/admin/flags/:name`).                                         |
| `Cookie`                                          | **`/v1/admin/*`:** signed session cookie from OAuth callback (same as normal logged-in API use). |
| `X-Request-Id`, `X-Session-Id`, `Idempotency-Key` | Optional; allowed by CORS for future/chat flows.                                                 |

Public flag routes (`GET /v1/flags`, `GET /v1/flags/:name`) do not require auth and are **not** rate-limited. **`/health`** and **`/v1/admin/*`** are skipped too (probes + authenticated admin surface). Everything else uses a **per-client** token bucket: prefer `X-Session-Id` when the client sends it, otherwise the client IP — not one global limit shared by all users. Skip list and future per-route bucket overrides live in [`src/middleware/rateLimit/skipConfig.ts`](src/middleware/rateLimit/skipConfig.ts).

**Chat:** max user message length is the code constant `CHAT_MAX_USER_MESSAGE_CHARS` in [`src/lib/config/constants.ts`](src/lib/config/constants.ts) (not env). **`verifyTurnstileToken`** in [`src/lib/cloudflare/turnstile.ts`](src/lib/cloudflare/turnstile.ts) — set `TURNSTILE_SECRET_KEY` for production checks; tests skip calling Cloudflare when the secret is unset.

**Browser CSRF-ish guard:** mutating methods (`POST`/`PUT`/`PATCH`/`DELETE`) require `Origin`/`Referer` to match the CORS list **or** the request’s public API origin; missing both allows non-browser clients (`curl`, workers). Configure **`CORS_ORIGIN`** for every SPA origin that calls the API cross-origin.

### Swagger UI: server dropdown and admin **Try it out**

1. **Session:** complete OAuth login against this API so the session cookie is stored for the API host; ensure your user is admin in SQLite (`is_admin = 1`).
2. **Server dropdown** (top of Swagger): choose the URL that matches where the API actually runs. On a deployed host (e.g. `https://dev-api.chatxiv.com`), use **Same host** (`/`) or that full `https://…` origin — **not** `localhost` unless the API really is on your laptop. For local Docker, pick **`http://localhost:3000`** or **`http://127.0.0.1:3000`** to match your address bar.
3. If **Try it out** still returns **403** with “Origin not allowed”, fix forwarded headers (see paragraph above) or append your API origin to **`CORS_ORIGIN`** and restart.

## curl examples

Replace `BASE` as needed. **`/v1/admin/*`** expects the **signed session cookie** from the browser after OAuth (there is no separate admin API key in the current code). For scripts, either export cookies from the browser after logging in as an admin, or call only public routes.

```bash
# Health
curl -sS "$BASE/health"

# Public OpenAPI YAML only
curl -sS "$BASE/v1/openapi.yaml" -o chatxiv-openapi-public.yaml

# List flags (public)
curl -sS "$BASE/v1/flags"

# Get one flag (public); unknown names return enabled: false
curl -sS "$BASE/v1/flags/my-feature"

# Admin (requires Cookie header from an admin session), e.g. cookie jar:
# curl -c cookies.txt -b cookies.txt ...
# Full OpenAPI YAML — same cookie as other admin routes
curl -sS -b "chatxiv_sid=YOUR_SIGNED_COOKIE_VALUE" "$BASE/v1/admin/openapi.yaml" -o chatxiv-openapi-full.yaml

# Admin: list flags (example with cookie jar file after you populated it)
curl -sS -b cookies.txt "$BASE/v1/admin/flags"
```

Example with defaults:

```bash
BASE=http://localhost:3000
```

## Postman

1. **Import spec:** **Import** → **Link** → `http://localhost:3000/v1/openapi.yaml` for the **public** contract. For the **admin** spec, log in via the browser, copy the session cookie for the API host, and add it under **Cookies** for that host in Postman (or use **Interceptor** / manual **Cookie** header), then import `http://localhost:3000/v1/admin/openapi.yaml` if reachable with that cookie.
2. **Base URL:** Set a collection or environment variable (e.g. `baseUrl` = `http://localhost:3000`).
3. **Admin requests:** send the same **session cookie** as an admin browser session; there is no `X-Admin-Key` in the current implementation.

If Postman does not resolve variables inside the imported `servers` URL, override the request URL or define a server in your environment.

## Errors

JSON error bodies follow the shared shape `ApiErrorResponse` in `@chatxiv/cdm` (`code`, `message`, optional `requestId`). Typical cases:

- **401** on admin routes: not logged in (no valid session cookie).
- **403** on admin routes: logged in but `users.is_admin` is false, or **Swagger Try it out** with `FORBIDDEN` / “Origin not allowed” — fix **`CORS_ORIGIN`** to include the API origin you use in the browser (see [Admin Swagger in the browser](#admin-swagger-in-the-browser)).
- **400** with `VALIDATION_ERROR`: bad flag name pattern or invalid JSON body (`enabled` must be a boolean).

## Scheduled jobs

In-process maintenance uses UTC wall-clock scheduling in [`src/lib/scheduler/processJobScheduler.ts`](src/lib/scheduler/processJobScheduler.ts) (`scheduleUtcJob` + [`utcSchedule.ts`](src/lib/scheduler/utcSchedule.ts)). Concrete jobs are registered in [`src/lib/scheduler/scheduledJobs.ts`](src/lib/scheduler/scheduledJobs.ts); [`src/server.ts`](src/server.ts) constructs the scheduler, calls `registerProcessScheduledJobs`, clears timers with `dispose()` on shutdown, then **`waitForInFlightJobs`** so any run in progress can finish (within the shutdown budget) before `server.close`. This is for work co-located with the API process, not a separate worker or distributed scheduler.

**Adhoc runs:** call exported task functions (e.g. `runObservabilityRetentionSweepTask`) from a script or REPL, or `await scheduler.runJobNow('observability-retention-sweep')` when you hold the scheduler instance. A future admin route could wrap the same helpers.

**Log correlation:** each scheduler run executes inside `requestContext.run({ requestId })` (same shape as HTTP). The shared `logger` therefore includes `requestId` on every line for that run—including nested services—so you can tie scheduler warnings to other logs in Loki or stdout. Direct calls to exported task functions outside the scheduler do not set context unless you wrap them yourself.

## BFF + private API (target architecture optional)

The browser can call **`https://www.chatxiv.com/api/...`** (or a Cloudflare **Worker** / **Pages Function** on that host) so requests are **same-origin** with the SPA. That Worker forwards to the real API over **Cloudflare Tunnel** or a **non-public origin**; clients never need your VPS IP. Only Cloudflare’s edge talks to the tunnel / internal URL. See [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) and [Tunnels](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/).

## Developer commands

See the repo root [docs/README.md](../docs/README.md) for install, lint, test, coverage, and build across workspaces.

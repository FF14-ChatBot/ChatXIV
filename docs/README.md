# ChatXIV — Developer setup

Succinct guide for running, linting, testing, and building the repo.

## What you'll need

- **Node 24+** and **npm**
- Optional: **git-crypt** if you need access to encrypted design docs in `docs/design-documents/` (see [git-crypt setup](git-crypt-setup.md))
- Optional: **Docker** if you build or run the [backend container](../backend/README.md#docker). On **Windows**, use **Docker Desktop** with the **WSL 2–based Linux engine** (see [Docker Desktop and Linux engine](#docker-desktop-and-linux-engine-optional)).

## First-time setup

1. Clone the repo.
2. Install dependencies:
   - **Preferred:** `npm install` at the repo root (workspaces install backend, frontend, and `packages/*`).
   - **Avoid** `npm install` only inside `backend/` or `frontend/` — use the root so the workspace lockfile stays consistent.
3. Backend env: the backend loads variables from `backend/.env` via dotenv. Create `backend/.env` if needed (e.g. `DEBUG_MODE`, `PORT`). `.env` is gitignored. If you enable OIDC login (see `backend/.env.example`), set **`FRONTEND_ORIGIN`** to the SPA’s public URL (e.g. `http://localhost:5173` in dev, `https://www.chatxiv.com` in production) so the browser returns there after OAuth instead of the API host (`/` on port 3000). Optional: set **`LOKI_HOST`**, **`LOKI_USER_ID`**, and **`LOKI_PASSWORD`** together to ship logs to Grafana Cloud Loki (see `backend/README.md`).
4. Frontend env: create `frontend/.env` (and/or `frontend/.env.production`) for Vite-exposed variables (must start with `VITE_`), e.g. `VITE_CHATXIV_BACKEND_URL`.
5. Optional repo root **`.env`:** copy [`.env.example`](../.env.example) if you use **`npm run webhook:listen`**. Not loaded by Vite or the backend.
6. **Backend persistence uses SQLite** at `./data/app.db` relative to the backend process cwd (`APP_DATA_DIRECTORY` in `backend/src/lib/config/constants.ts`; not env-driven). See [Observability-SQLite-Persistence](tasks/backend/Observability-SQLite-Persistence.md). Uses [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) — **not** `node:sqlite`. **`npm run build`** only runs TypeScript/Vite; it does **not** compile the addon. **Native code runs during `npm install`:** `better-sqlite3` downloads a prebuilt binary when available (usual case). If not, it compiles with **`node-gyp`** (comes with **npm**); that fallback needs [OS-level C++ build tools](https://github.com/nodejs/node-gyp#installation) (e.g. Visual Studio Build Tools on Windows). This repo does **not** add a separate `node-gyp` dependency — `better-sqlite3` already runs the install/rebuild step.

## How to run

- **Backend (dev):** `cd backend && npm run dev` — Express + TypeScript; health at `http://localhost:3000/health`. API docs: public Swagger UI at `http://localhost:3000/v1/docs/`, admin Swagger UI at `http://localhost:3000/v1/admin/docs/` (requires an **admin** OAuth session cookie); public OpenAPI YAML at `http://localhost:3000/v1/openapi.yaml`, full YAML at `http://localhost:3000/v1/admin/openapi.yaml` (same session auth). See [backend/README.md](../backend/README.md) for curl, Postman, CORS / Swagger **Try it out**, and headers.
- **Frontend (dev):** `cd frontend && npm run dev` — React + Vite at `http://localhost:5173`. No **`node --watch`**: **`src/`** updates hot-reload via Vite; restart the dev server yourself after **`vite.config.ts`** or **`scripts/dev.mjs`** changes. The bootstrap **retries binding 5173** briefly if the port is still releasing. If **5173** stays busy, stop the other process.
- **From repo root:** `npm run dev:backend` / `npm run dev:frontend` (after root `npm install`)

## Docker Desktop and Linux engine (optional)

Use this when you want to run **`docker build -f backend/Dockerfile`** locally (same image CI builds). The backend image is **Linux/amd64** (Alpine); on Windows and macOS, Docker runs it through a **Linux VM** (Docker Desktop).

### Windows

1. **Install [Docker Desktop for Windows](https://docs.docker.com/desktop/setup/install/windows-install/)** using the official installer. Allow it to enable **WSL 2** and install/update components when prompted — the default **Linux containers** backend is **WSL 2**, not “Windows containers.”
2. Ensure **WSL 2** is available: follow Microsoft’s [WSL install guide](https://learn.microsoft.com/windows/wsl/install) if Docker prompts you. After major OS updates, run **`wsl --update`** in an elevated terminal if Docker’s Linux engine misbehaves.
3. **Start Docker Desktop** and wait until it reports **running** (whale icon in the system tray). First launch can take a minute while the Linux engine starts.
4. Optional: **Settings → Resources → WSL integration** — turn on integration for your default WSL distro if you use the CLI from inside WSL.
5. **Verify** in PowerShell or cmd:
   - `docker version` — you should see both **Client** and **Server** sections.
   - `docker run --rm hello-world` — confirms the Linux engine can pull and run images.

### macOS

Install **[Docker Desktop for Mac](https://docs.docker.com/desktop/setup/install/mac-install/)**, start it, then run `docker version` and `docker run --rm hello-world`.

### Linux

Install **[Docker Engine](https://docs.docker.com/engine/install/)** and the [Compose plugin](https://docs.docker.com/compose/install/linux/) per your distribution. Add your user to the `docker` group if you use rootless paths, then verify with `docker version`.

### Troubleshooting (Windows)

| Symptom | What to try |
|--------|-------------|
| `docker_engine` pipe / “daemon not running” | Start **Docker Desktop**; wait until fully up; open a **new** terminal. |
| `500 Internal Server Error` / Linux engine | Restart Docker Desktop; run **`wsl --shutdown`** then start Docker again; **`wsl --update`**. |
| `docker` not found | Reboot after install, or confirm Docker Desktop added itself to **PATH**. |

## Lint and format

- **Lint:** ESLint in both packages.
  - Root (both): `npm run lint`
  - Root (per side): `npm run lint:backend` or `npm run lint:frontend`
  - Per package: `cd backend && npm run lint` or `cd frontend && npm run lint`
- **Format:** Prettier in both packages. `npm run format` (write), `npm run format:check` (check). From root: `npm run format` / `npm run format:check` run both.

## Test and coverage

- **Runner:** Vitest in both backend and frontend.
- **Layout:** Spec files and test-only helpers live under `backend/tests/` and `frontend/tests/`, mirroring the `src/` tree (for example `src/lib/config/env.ts` → `tests/lib/config/env.test.ts`). Vitest resolves `@src/…` and `@test/…` (backend) and `@/…` (frontend) to each package’s `src/` (and backend `tests/` for shared mocks).
- **Coverage target:** 90% (enforced; thresholds in each package’s `vitest.config.ts`). Entry points and test files are excluded from coverage so the threshold applies to application source only.
- **Commands:**
  - Root (both): `npm run test`; `npm run test:coverage` (coverage for both)
  - Root (per side): `npm run test:backend` or `npm run test:frontend`
  - Per package: `npm run test`, `npm run coverage` (or `npm run test:watch` for watch mode)

## Build

- Root (both): `npm run build` (builds backend then frontend)
- Root (per side): `npm run build:backend` or `npm run build:frontend`
- Per package: `cd backend && npm run build`; `cd frontend && npm run build`
- **Clean outputs:** `npm run clean` removes `dist`, `dist-node`, and `coverage` under backend, frontend, and CDM (does **not** delete `node_modules`). Use when you suspect stale compiled files before rebuilding. To fully reset dependencies, delete **`node_modules`** at the repo root (and any workspace copies) and run **`npm ci`**.
- **Backend container:** from the repo root, `npm run docker:build:backend` then `npm run docker:run:backend` (needs `backend/.env`; see [backend/README.md](../backend/README.md#docker)). Or use the `docker build` / `docker run` commands shown there. [Docker Desktop / WSL 2](#docker-desktop-and-linux-engine-optional) if you have not installed Docker yet. SQLite lives on the **`chatxiv-data`** volume at **`/data/app.db`** inside the container; to list OIDC `sub` values, run SQL via a throwaway Alpine container (or `docker cp`) as described in [Inspecting SQLite and bootstrapping admin (OIDC)](../backend/README.md#inspecting-sqlite-and-bootstrapping-admin-oidc).

## CI

- **GitHub Actions** in `.github/workflows/`: backend and frontend have separate workflows.
- **Triggers:** Path-based — backend CI on changes under `backend/`, `packages/cdm/`, root `.dockerignore`, and its workflow file; frontend CI on changes under `frontend/` (and its workflow file). Backend CI also runs a **`docker build -f backend/Dockerfile`** smoke build. Lint, test, coverage, build, and audit run per package (frontend path unchanged).
- **Install:** Workflows run `npm ci` at the **repository root** using the root `package-lock.json` so npm workspaces (and root devDependencies such as Husky) install consistently; job steps still use `backend/` or `frontend/` as their working directory for lint, test, and build.
- **Lockfile:** Keep the root `package-lock.json` in sync when you change dependencies (workspace-wide graph).

## Cloudflare Tunnel and Zero Trust Access (team dev URLs)

### Can several people use the same `dev-www` CNAME?

**Not to different laptops at the same time.** A **tunnel** (the UUID + `credentials-file` in `cloudflared`) has **one active connector**: whichever machine is running `cloudflared tunnel run …` for that tunnel “owns” the public hostnames routed through it. If someone else runs the **same** credentials, connections fight or only one session stays healthy.

**Ways to share public HTTPS dev:**

| Approach | Who gets the URL | Notes |
|----------|------------------|--------|
| **One shared tunnel** | Whoever runs `cloudflared` on the machine that has the credentials | Same `dev-www` / `dev-api` → that box only. Good for a single “dev server” PC. |
| **Tunnel per developer** | Each person: **new tunnel** + **their own DNS names** | e.g. `dev-alex-www.chatxiv.com` → Alex’s laptop, `dev-sam-www.chatxiv.com` → Sam’s. Recommended for multiple laptops. |
| **Quick Tunnel** | Temporary random `*.trycloudflare.com` | No DNS in your zone; fine for quick demos. |

Do **not** commit tunnel `*.json` credentials; keep them under `~/.cloudflared/` (or similar) per machine.

### Cloudflare Zero Trust — Access (who can open the URL)

Access sits **in front of** the tunnel hostname on Cloudflare’s edge: users sign in **before** traffic reaches your laptop.

1. **Zero Trust → Access → Applications → Add an application → Self-hosted.**
2. **Public hostname:** use **Subdomain** + **Domain** (e.g. `dev-www` + `chatxiv.com`), **Path** `/` unless you intentionally scope a subpath.
3. **One app, multiple hostnames:** you can add several rows (e.g. `dev-www`, `dev-api`, `dev-hook`) so the **same policies** apply to frontend, API, and webhook — or split apps if you need different **CORS / cookie** settings per hostname.
4. **Policies (order matters):** Access evaluates **Bypass** and **Service auth** first, then top-to-bottom.
   - Add an **Allow** policy: **Include → Emails** (or your IdP groups) for people who should reach dev.
   - Avoid a broad **Allow everyone** above your team rule.
   - **Require** rules (e.g. “Login method = One-time PIN”) are optional if the app already only offers OTP.
5. **Login methods:** Zero Trust → Settings → Authentication (or per-app). **One-time PIN** is fine for small teams; add **Google/GitHub** if email delivery is flaky.
6. **Access CORS (API app vs SPA):** if the browser loads `https://dev-www…` and calls `https://dev-api…`, you may need **Allow origin** = your SPA origin and **Allow credentials** on the **API** Access app when the browser shows CORS errors.
7. **Backend CORS (Express):** still required for API responses; set **`CORS_ORIGIN`** for each **https** dev-web origin (see [`backend/src/lib/config/cors.ts`](../backend/src/lib/config/cors.ts)).

### Local app config (Vite + env)

- **[`frontend/vite.config.ts`](../frontend/vite.config.ts):** **`server.allowedHosts: ['.chatxiv.com']`** for tunnel **`Host`**; **`server.host: true`** so **`cloudflared`** → **`127.0.0.1:5173`** does not hit an IPv6-only bind (**502**). **`server.proxy`** maps **`/v1`**, **`/health`** → **`localhost:3000`** (no **`/api`** prefix). **[`frontend/scripts/dev.mjs`](../frontend/scripts/dev.mjs)** repeats **`server`** on **`createServer()`** so merge does not drop **`host`** / **`allowedHosts`** while proxy/port still come from the file.
- **`frontend/.env`:** **`VITE_CHATXIV_BACKEND_URL`** = your **https** API tunnel URL (e.g. `https://dev-alex-api.chatxiv.com`). Optional **`VITE_DEPLOY_ENV`** (e.g. `production` vs `preview` or `beta`) distinguishes Cloudflare **Pages** production vs preview builds in telemetry; unset uses Vite **`MODE`**. Optional **AdSense** publisher + slot ids live in **`frontend/src/lib/adsense/adsenseConfig.ts`** — see **`frontend/.env.example`**.

#### Tunnel: public URL works but UI is unstyled (localhost looks fine)

If **`https://dev-www…`** shows a flat white page, missing header/composer chrome, gradients, or a stuck light theme, while **`http://localhost:5173`** looks correct, try the following before changing app code.

1. **Cookies and site data (try this first)** — Stale **cookies**, **local storage**, or **Access** session data for the dev hostname can leave the page in a bad state in **one browser** while another still looks fine. **Clear cookies and site data** for **`dev-www…`** (or the whole **`chatxiv.com`** dev host), or use a **private/incognito** window. In Firefox: site permissions / “Clear cookies and site data” for that site; unregister **service workers** under **`about:debugging`** if you use them on that origin.

2. **Content-Security-Policy** — Cloudflare **Zero Trust → Access → application**, **Transform Rules**, or zone **HTTP response headers** may send a strict **`style-src`** (or full CSP) that blocks **Vite dev** from applying CSS. Dev mode injects styles in ways strict CSP often rejects. **Localhost** has no such headers, so it still works.

   - **Fix (Cloudflare):** On the **dev hostname only**, remove that CSP or relax **`style-src`** for development (team policy permitting).
   - **Alternative:** Run **`npm run build`** then **`npm run preview`** in **`frontend/`** and point tunnel ingress at the preview port; preview serves linked stylesheets, which often satisfies strict CSP. You may need to set **`preview.host`** / **`preview.allowedHosts`** in **`vite.config.ts`** if the tunnel **`Host`** header is rejected.

3. **Confirm:** Browser **DevTools → Console** for CSP violations (`style-src`, `Refused to apply inline style`, etc.) and **Network** for failed CSS requests.

### Add a tunnel for another developer (checklist)

Have them (or an admin) do the following; names are examples — pick a consistent prefix per person.

1. **Cloudflare:** Zero Trust → **Networks** → **Tunnels** → **Create a tunnel** (new name, e.g. `chatxiv-dev-alex`). Install `cloudflared` and note the **tunnel UUID**.
2. **Credentials:** save the downloaded **`*.json`** on **that developer’s machine only** (e.g. `~/.cloudflared/<uuid>.json`). Do not put it in git.
3. **DNS / public hostnames:** in the tunnel (or DNS app), route two hostnames to the tunnel, e.g. **`dev-alex-www.chatxiv.com`** → `http://127.0.0.1:5173`, **`dev-alex-api.chatxiv.com`** → `http://127.0.0.1:3000`, plus catch-all **`http_status:404`** last in **ingress**.
4. **Local `config.yml`:** on their laptop, `tunnel: <uuid>`, `credentials-file: …`, **`ingress`** as above (same pattern as your main dev tunnel).
5. **Access:** add **`dev-alex-www`** and **`dev-alex-api`** to the **same** Self-hosted application (or clone policies). Include their email in the **Allow** policy.
6. **Env:** their **`frontend/.env`**: `VITE_CHATXIV_BACKEND_URL=https://dev-alex-api.chatxiv.com`. Their **`backend/.env`**: extend **`CORS_ORIGIN`** with `https://dev-alex-www.chatxiv.com` (comma-separated).
7. **Run:** `cloudflared tunnel run <name>`, then **`npm run dev:frontend`** and **`npm run dev:backend`** on their machine.

Optional: a **third** pair of hostnames for **`webhook:listen`** (e.g. `dev-alex-hook.chatxiv.com` → `127.0.0.1:8790`) if they use their **own** GitHub webhook secret and listener.

## Tunneled dev: GitHub webhook → pull `origin/main`

When **`dev-www` / `dev-api` point at your laptop** via Cloudflare Tunnel, CI deploys do not update that machine. To **fast-forward the clone when `main` is pushed** (direct pushes or merges), run the local listener and register a GitHub webhook.

### 1. Listener (this repo)

- **`GITHUB_WEBHOOK_SECRET`** in repo root **`.env`** must match the GitHub webhook **Secret** (see [`.env.example`](../.env.example); separate from **`frontend/.env`** / **`backend/.env`**).
- **`npm run webhook:listen`** (repo root): **`http://127.0.0.1:8790`** by default — **`GET /health`**, **`POST /webhooks/github`**.
- **Branch:** on each push to **`main`**, the listener **checks out `main`**, **fast-forwards** to **`origin/main`** (refuses if the working tree is not clean), runs **`npm install`** at the repo root when **`package-lock.json`** changed, then runs **`npm run build:cdm`** and **`npm run build:backend`** from the repo root when **`HEAD`** is **`main`** (otherwise the webhook fails so the backend is not built from the wrong branch). It then updates the mtime of **`backend/src/server.ts`** so **`npm run dev:backend`** (**`tsx watch`**) picks up a restart. **`dev:frontend`** is not watch-driven; Vite HMR applies pulled app code—restart it yourself if **`vite.config`** or dev bootstrap changed. For production **`node dist/server.js`** or other process managers, restart those yourself if needed.

### 2. Cloudflare Tunnel

Add an ingress hostname (e.g. **`dev-hook.chatxiv.com`**) → **`http://127.0.0.1:8790`**. Put **Cloudflare Access** on that hostname the same way as **`dev-www` / `dev-api`** (see **Cloudflare Tunnel and Zero Trust Access** above: policies, public hostname, optional second app). Prefer a **dedicated** hook hostname so you do not mix webhook `POST`s with Vite asset traffic.

### 3. GitHub webhook

**Repository → Settings → Webhooks → Add webhook**

- **Payload URL:** `https://dev-hook.chatxiv.com/webhooks/github` (your hostname + path; no trailing slash unless you set `WEBHOOK_PATH` to match).
- **Content type:** `application/json`
- **Secret:** same value as **`GITHUB_WEBHOOK_SECRET`**
- **Events:** **Just the push event** (or enable pushes only to `main` if your UI offers a branch filter)

Optional: set **`GITHUB_REPO_FULL_NAME`** (e.g. `Owner/Repo`) in the listener env so deliveries for other repos are ignored after signature verification.

The listener writes **`GET /health`** and every webhook **`→ HTTP …`** response to stderr, and after a valid signature logs the **`push`** JSON body plus a one-line **`← push …`** summary.

### 4. After a pull

**Vite** hot-reloads many edits while the dev server runs. After a webhook sync it still runs **`npm run build:cdm`** and **`npm run build:backend`**, then touches **`backend/src/server.ts`** so **`dev:backend`** restarts via **`tsx watch`**. Restart **`dev:frontend`** yourself when **`vite.config`**, env, or dev bootstrap changes. Production **`dist`** still needs a manual or external restart.

### 5. Security

The secret proves the body came from GitHub. **Access** on the tunnel hostname blocks random browsers; do not expose the listener without **signature verification** and a strong secret.

## Design docs and other docs

- **[Design Documents](design-documents)** — Contains initial designs and scope of this project. Encrypted for the owners of the project only.
- **[git-crypt setup](git-crypt-setup.md)** — How `docs/design-documents/` encryption works and how to get access.
- **[Task specs and implementation status](tasks/README.md)** — Backend/frontend/CDM milestone docs under `docs/tasks/` plus a **repo scan** of what is done vs remaining.
- Other docs live under `docs/`.

## Project structure

This repo uses **npm workspaces** (`backend/`, `frontend/`, `packages/*`). Each package has its own `package.json`; the **single** root `package-lock.json` locks the whole workspace (run **`npm install`** / **`npm ci`** at the repo root only).

- **backend/** — Express + TypeScript API; own `package.json`.
- **frontend/** — React + Vite app; own `package.json`.
- **packages/cdm/** — Shared types package (`@chatxiv/cdm`).
- **Root `package.json`** — Workspace root; convenience scripts (`dev:backend`, `dev:frontend`, `build`, `lint`, `format`, `format:check`, `test`, `test:coverage`).

## FAQ

### Why only one lockfile?

**npm workspaces** are pinned by the root **`package-lock.json`**. That keeps backend, frontend, and CDM in one reproducible graph (including root **`overrides`** for security patches). **GitHub Actions** runs **`npm ci`** from the repo root.

### How do I run backend and frontend together?

Run each in a separate terminal: `npm run dev:backend` and `npm run dev:frontend` from the root (after root `npm install`), or `cd backend && npm run dev` and `cd frontend && npm run dev`.

### Public dev URL (e.g. Cloudflare Tunnel) — frontend “host error” but API works

**Vite** → **403** and a plain-text body starting with **`Blocked request…allowedHosts`**. **Cloudflare** → HTML error page. Full tunnel setup: **Cloudflare Tunnel and Zero Trust Access**; **`server` tuning:** **Local app config** above.

```bash
curl -s -D - -o NUL -H "Host: dev-www.chatxiv.com" http://127.0.0.1:5173/
```

**403** → fix `allowedHosts` / restart dev. **200** locally but the public URL fails → compare **DNS** / **ingress** for `dev-www` vs working `dev-api`. **502** on the public URL often means **`cloudflared`** cannot reach the local port (dev server down) or a host/bind mismatch (see **Local app config**).

### How should production domains be configured?

- Recommended split:
  - Frontend app: `https://www.chatxiv.com`
  - Backend API: `https://api.chatxiv.com`
- Frontend build-time env:
  - `VITE_CHATXIV_BACKEND_URL=https://api.chatxiv.com`
- Backend CORS allowlist:
  - include `https://www.chatxiv.com` (via `CORS_ORIGIN` or defaults in `backend/src/lib/config/cors.ts`)

### Do I run `npm install` at the root?

Yes. Run `npm install` at the repo root; workspaces install backend, frontend, and `packages/*`. Per-package install also works if needed.

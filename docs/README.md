# ChatXIV — Developer setup

Succinct guide for running, linting, testing, and building the repo.

## What you'll need

- **Node 20+** and **npm**
- Optional: **git-crypt** if you need access to encrypted design docs in `docs/design-documents/` (see [git-crypt setup](git-crypt-setup.md))

## First-time setup

1. Clone the repo.
2. Install dependencies:
   - **Preferred:** `npm install` at the repo root (workspaces install backend, frontend, and `packages/*`).
   - **Or per-package:** `cd backend && npm install`, `cd frontend && npm install`, etc.
3. Backend env: the backend loads variables from `backend/.env` via dotenv. Create `backend/.env` if needed (e.g. `DEBUG_MODE`, `PORT`). `.env` is gitignored.
4. Frontend env: create `frontend/.env` (and/or `frontend/.env.production`) for Vite-exposed variables (must start with `VITE_`), e.g. `VITE_CHATXIV_BACKEND_URL`.
5. Optional repo root **`.env`:** copy [`.env.example`](../.env.example) if you use **`npm run webhook:listen`**. Not loaded by Vite or the backend.

## How to run

- **Backend (dev):** `cd backend && npm run dev` — Express + TypeScript; health at `http://localhost:3000/health`
- **Frontend (dev):** `cd frontend && npm run dev` — React + Vite at `http://localhost:5173`
- **From repo root:** `npm run dev:backend` / `npm run dev:frontend` (after root `npm install`)

## Lint and format

- **Lint:** ESLint in both packages.
  - Root (both): `npm run lint`
  - Root (per side): `npm run lint:backend` or `npm run lint:frontend`
  - Per package: `cd backend && npm run lint` or `cd frontend && npm run lint`
- **Format:** Prettier in both packages. `npm run format` (write), `npm run format:check` (check). From root: `npm run format` / `npm run format:check` run both.

## Test and coverage

- **Runner:** Vitest in both backend and frontend.
- **Coverage target:** 90% (enforced; thresholds in each package’s `vitest.config.ts`). Entry points and test files are excluded from coverage so the threshold applies to application source only.
- **Commands:**
  - Root (both): `npm run test`; `npm run test:coverage` (coverage for both)
  - Root (per side): `npm run test:backend` or `npm run test:frontend`
  - Per package: `npm run test`, `npm run coverage` (or `npm run test:watch` for watch mode)

## Build

- Root (both): `npm run build` (builds backend then frontend)
- Root (per side): `npm run build:backend` or `npm run build:frontend`
- Per package: `cd backend && npm run build`; `cd frontend && npm run build`

## CI

- **GitHub Actions** in `.github/workflows/`: backend and frontend have separate workflows.
- **Triggers:** Path-based — backend CI on changes under `backend/` (and its workflow file); frontend CI on changes under `frontend/` (and its workflow file). Lint, test, coverage, build, and audit run per package.
- **Install:** Workflows run `npm ci` at the **repository root** using the root `package-lock.json` so npm workspaces (and root devDependencies such as Husky) install consistently; job steps still use `backend/` or `frontend/` as their working directory for lint, test, and build.
- **Lockfiles:** Keep the root `package-lock.json` in sync when you change dependencies. `backend/` and `frontend/` also keep their own lockfiles for local per-package installs.

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

- **[`frontend/vite.config.ts`](../frontend/vite.config.ts):** **`server.allowedHosts: ['.chatxiv.com']`** accepts tunnel **`Host`** headers; **`server.host: true`** avoids an IPv6-only bind when **`cloudflared`** forwards to **`127.0.0.1:5173`** (otherwise Cloudflare **502** / host errors). **[`frontend/scripts/dev.mjs`](../frontend/scripts/dev.mjs)** sets the same **`server`** options on **`createServer()`** because programmatic startup can drop them after config merge while still inheriting proxy/port from the file.
- **`frontend/.env`:** **`VITE_CHATXIV_BACKEND_URL`** = your **https** API tunnel URL (e.g. `https://dev-alex-api.chatxiv.com`).

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
- **Branch:** sync runs only if the clone is checked out on **`main`** (so pushes to `main` do not merge into a feature branch by mistake).

### 2. Cloudflare Tunnel

Add an ingress hostname (e.g. **`dev-hook.chatxiv.com`**) → **`http://127.0.0.1:8790`**. Put **Cloudflare Access** on that hostname the same way as **`dev-www` / `dev-api`** (see **Cloudflare Tunnel and Zero Trust Access** above: policies, public hostname, optional second app). Prefer a **dedicated** hook hostname so you do not mix webhook `POST`s with Vite asset traffic.

### 3. GitHub webhook

**Repository → Settings → Webhooks → Add webhook**

- **Payload URL:** `https://dev-hook.chatxiv.com/webhooks/github` (your hostname + path; no trailing slash unless you set `WEBHOOK_PATH` to match).
- **Content type:** `application/json`
- **Secret:** same value as **`GITHUB_WEBHOOK_SECRET`**
- **Events:** **Just the push event** (or enable pushes only to `main` if your UI offers a branch filter)

Optional: set **`GITHUB_REPO_FULL_NAME`** (e.g. `Owner/Repo`) in the listener env so deliveries for other repos are ignored after signature verification.

### 4. After a pull

**Vite** usually hot-reloads source changes; **`npm install`** runs automatically when **`package-lock.json`** changes. Restart frontend/backend yourself if something does not pick up (env, native deps, etc.).

### 5. Security

The secret proves the body came from GitHub. **Access** on the tunnel hostname blocks random browsers; do not expose the listener without **signature verification** and a strong secret.

## Design docs and other docs

- **[Design Documents](design-documents)** — Contains initial designs and scope of this project. Encrypted for the owners of the project only.
- **[git-crypt setup](git-crypt-setup.md)** — How `docs/design-documents/` encryption works and how to get access.
- Other docs live under `docs/`.

## Project structure

This repo uses **npm workspaces** (`backend/`, `frontend/`, `packages/*`). Each package has its own `package.json`; `backend/` and `frontend/` also have their own lockfiles for local per-package installs. **CI** uses the root `package-lock.json`. Run `npm install` at the repo root to install everything.

- **backend/** — Express + TypeScript API; own `package.json` and lockfile.
- **frontend/** — React + Vite app; own `package.json` and lockfile.
- **packages/cdm/** — Shared types package (`@chatxiv/cdm`).
- **Root `package.json`** — Workspace root; convenience scripts (`dev:backend`, `dev:frontend`, `build`, `lint`, `format`, `format:check`, `test`, `test:coverage`).

## FAQ

### Why two lockfiles?

Backend and frontend each have their own `package-lock.json` for local installs and tooling. **GitHub Actions** runs `npm ci` from the repo root using the root lockfile. Root `npm install` via workspaces still installs everything.

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

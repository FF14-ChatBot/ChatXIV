# ChatXIV — Developer setup

Succinct guide for running, linting, testing, and building the repo.

## What you'll need

- **Node 20+** and **npm**
- Optional: **git-crypt** if you need access to encrypted design docs in `docs/design-documents/` (see [git-crypt setup](git-crypt-setup.md))

## First-time setup

1. Clone the repo.
2. Install dependencies in each package:
   - `cd backend && npm install`
   - `cd frontend && npm install`
3. Backend env: the backend loads variables from `backend/.env` via dotenv. Create `backend/.env` if needed (e.g. `DEBUG_MODE`, `PORT`). `.env` is gitignored.

## How to run

- **Backend (dev):** `cd backend && npm run dev` — Express + TypeScript; health at `http://localhost:3000/health`
- **Frontend (dev):** `cd frontend && npm run dev` — React + Vite at `http://localhost:5173`
- **From repo root:** `npm run dev:backend` / `npm run dev:frontend` (uses `--prefix`; requires install in each package first)

## Lint and format

- **Lint:** ESLint in both packages.
  - Root: `npm run lint` (runs backend + frontend lint)
  - Per package: `cd backend && npm run lint` or `cd frontend && npm run lint`
- **Format:** Prettier in both packages. `npm run format` (write), `npm run format:check` (check). From root: `npm run format` / `npm run format:check` run both.

## Test and coverage

- **Runner:** Vitest in both backend and frontend.
- **Coverage target:** 90% (enforced; thresholds in each package’s `vitest.config.ts`). Entry points and test files are excluded from coverage so the threshold applies to application source only.
- **Commands:**
  - Root: `npm run test` (both packages); `npm run test:coverage` (coverage for both)
  - Per package: `npm run test`, `npm run coverage` (or `npm run test:watch` for watch mode)

## Build

- Root: `npm run build` (builds backend then frontend)
- Per package: `cd backend && npm run build`; `cd frontend && npm run build`

## CI

- **GitHub Actions** in `.github/workflows/`: backend and frontend have separate workflows.
- **Triggers:** Path-based — backend CI on changes under `backend/` (and its workflow file); frontend CI on changes under `frontend/` (and its workflow file). Lint, test, coverage, build, and audit run per package.
- **Lockfiles:** Commit `package-lock.json` in both `backend/` and `frontend/` when you add or change dependencies.

## Design docs and other docs

- **[Design Documents](design-documents)** — Contains initial designs and scope of this project. Encrypted for the owners of the project only.
- **[git-crypt setup](git-crypt-setup.md)** — How `docs/design-documents/` encryption works and how to get access.
- Other docs live under `docs/`.

## Project structure

This repo uses a **multi-repo (per-package) approach**: no npm workspaces; each package has its own `package.json` and `package-lock.json`; you install and run from each package (or use root convenience scripts).

- **backend/** — Express + TypeScript API; own `package.json` and lockfile.
- **frontend/** — React + Vite app; own `package.json` and lockfile.
- **Root `package.json`** — Convenience scripts only (`dev:backend`, `dev:frontend`, `build`, `lint`, `format`, `format:check`, `test`, `test:coverage`). Root scripts use `npm run … --prefix <package>`. There is no root `npm install`; dependencies are installed in each package.

## FAQ

### Why two lockfiles?

There are two packages and no workspaces; each package has its own `package-lock.json`. CI runs per package and caches each lockfile.

### How do I run backend and frontend together?

Run each in a separate terminal (`cd backend && npm run dev` and `cd frontend && npm run dev`), or use root scripts from two terminals: `npm run dev:backend`, `npm run dev:frontend`.

### Do I run `npm install` at the root?

No. Run `npm install` inside `backend/` and inside `frontend/`.

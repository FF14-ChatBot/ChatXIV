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
- **Lockfiles:** Commit `package-lock.json` in both `backend/` and `frontend/` when you add or change dependencies.

## Design docs and other docs

- **[Design Documents](design-documents)** — Contains initial designs and scope of this project. Encrypted for the owners of the project only.
- **[git-crypt setup](git-crypt-setup.md)** — How `docs/design-documents/` encryption works and how to get access.
- Other docs live under `docs/`.

## Project structure

This repo uses **npm workspaces** (`backend/`, `frontend/`, `packages/*`). Each package has its own `package.json`; `backend/` and `frontend/` also have their own lockfiles for CI caching. Run `npm install` at the repo root to install everything.

- **backend/** — Express + TypeScript API; own `package.json` and lockfile.
- **frontend/** — React + Vite app; own `package.json` and lockfile.
- **packages/cdm/** — Shared types package (`@chatxiv/cdm`).
- **Root `package.json`** — Workspace root; convenience scripts (`dev:backend`, `dev:frontend`, `build`, `lint`, `format`, `format:check`, `test`, `test:coverage`).

## FAQ

### Why two lockfiles?

Backend and frontend each have their own `package-lock.json` for CI caching. Root `npm install` via workspaces still installs everything.

### How do I run backend and frontend together?

Run each in a separate terminal: `npm run dev:backend` and `npm run dev:frontend` from the root (after root `npm install`), or `cd backend && npm run dev` and `cd frontend && npm run dev`.

### Do I run `npm install` at the root?

Yes. Run `npm install` at the repo root; workspaces install backend, frontend, and `packages/*`. Per-package install also works if needed.

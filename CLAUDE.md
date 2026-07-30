# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

ChatXIV is a chat-first FFXIV (Final Fantasy XIV) data assistant. See `AGENTS.md` for a condensed architecture/conventions summary and `docs/README.md` for the full developer setup guide — this file focuses on what's needed to work productively day-to-day.

## Commands

Run from the repo root unless noted. This is an npm-workspaces monorepo (`backend/`, `frontend/`, `packages/*`) with a **single root lockfile** — always `npm install`/`npm ci` at the root, never inside a workspace.

```bash
# Dev servers (separate terminals)
npm run dev:backend             # Express API, tsx watch, http://localhost:3000
npm run dev:frontend            # React + Vite, http://localhost:5173

# Lint / format
npm run lint                    # both packages; npm run lint:backend / lint:frontend for one
npm run format                  # write; npm run format:check for CI-style check

# Tests (Vitest in both packages)
npm run test                    # both packages + scripts/ node:test
npm run test:backend            # or npm run test:frontend
npm run test:coverage           # coverage for both; 90% threshold enforced per package

# Single test file / single test (run inside the package, not root)
cd backend && npx vitest run tests/lib/config/env.test.ts
cd backend && npx vitest run -t "test name substring"
cd frontend && npx vitest run tests/features/chat/ChatPage.test.tsx

# Build (order matters: CDM -> backend -> frontend; root script handles it)
npm run build
npm run build:cdm               # rebuild @chatxiv/cdm after changing shared types
npm run build:backend
npm run build:frontend
npm run clean                   # removes dist/dist-node/coverage (not node_modules)

# Backend Docker image (needs backend/.env from backend/.env.example)
npm run docker:build:backend
npm run docker:run:backend

# Security audit
npm run audit
```

The Husky pre-commit hook (`scripts/precommit-checks.mjs`) runs format → lint → test:coverage → build → audit automatically on `git commit` when source files changed — don't bypass it with `--no-verify`.

## Architecture

**Monorepo, npm workspaces:** `backend/` (Express + TypeScript API), `frontend/` (React + Vite SPA), `packages/cdm/` (`@chatxiv/cdm`, shared API contract types — request/response shapes, error codes, pagination constants). Never duplicate a type that belongs in CDM; rebuild it (`npm run build:cdm`) after changing it.

### Backend

- **DI:** TSyringe, composition root at `backend/src/lib/di/container.ts`. DI is reserved for services with swappable dependencies (stores, HTTP clients, cache) — stateless logic stays as plain exported functions.
- **Errors:** `AppError` factory methods (`.validation()`, `.internal()`, etc.) for anything that becomes an HTTP response; plain `Error` is correct for startup/config crashes that have no HTTP context.
- **Middleware:** DI-injected middleware is a class with an arrow-function `handler` property, resolved via `container.resolve()`; simple/stateless middleware is a plain function.
- **Env vars:** `process.env` is only read inside `lib/config/`. Everywhere else uses typed getters from `lib/config/env.ts` (`getPort()`, etc.). Names come from `ENV_KEYS` in `lib/config/constants.ts`, never bare string literals. Adding a var touches five places: `ENV_KEYS`, `environment.d.ts`, `.env.example`, a getter in `env.ts`, and a test in `tests/lib/config/env.test.ts`. Non-env tunables (e.g. `APP_DATA_DIRECTORY`, rate-limit numbers) are named exports in `constants.ts`.
- **Cache:** `CacheClient` abstraction (`lib/cache/`) fronting Redis or in-memory (`CACHE_BACKEND=redis|memory|auto`), registered via `initializeCache()`. Consumers check `hit`/`miss`/`unavailable` and call `throwIfCacheUnavailable`/`requireCacheHealthy` rather than falling through to upstream APIs on an unhealthy cache. `set()` always takes an explicit `ttlSeconds`.
- **Persistence:** SQLite via `better-sqlite3` (not `node:sqlite`) at `./data/app.db` (`APP_DATA_DIRECTORY`). All timestamp columns are `TEXT` ISO 8601, never epoch integers.
- **Scheduler:** in-process UTC-scheduled maintenance jobs in `lib/scheduler/`; each run executes inside `requestContext.run({ requestId })` for log correlation.
- **List endpoints:** any new collection-returning `GET` must be paginated from the start using `PaginatedResult<T>` + `LIST_DEFAULT_PAGE`/`LIST_DEFAULT_PAGE_SIZE`/`LIST_MAX_PAGE_SIZE` from CDM and `listPageQueryValidators`/`getListQuery` from `lib/pagination/listQuery.js`.
- **OpenAPI:** two specs, `openapi/openapi.public.yaml` and `openapi/openapi.admin.yaml` — update whichever surface changed, in the same PR as the code. `npm run build` copies both into `dist/openapi/`.
- **Imports:** ESM with explicit `.js` extensions even in `.ts` source.

### Frontend

- **Two-layer HTTP client pattern:** `clients/core/` is a generic, backend-agnostic fetch wrapper; `clients/<name>Api/` (e.g. `clients/chatxivApi/`) adds that backend's headers and parses its error shape into a typed error (`ApiClientError` for the ChatXIV API). App code never calls `fetch` directly and never imports core directly — always through a named per-backend client. Adding a second backend means a new `clients/<name>Api/` folder, not branching inside the existing client.
- **Singletons wired at boot** in `main.tsx` via `set*()`/`create*()` functions (e.g. `setChatxivApiClient(createChatxivApiClient())`), not module-level side effects.
- **Feature-scoped routes** live under `features/` (e.g. `features/chat/` owns `ChatSessionContext`, `ChatConversationContext`, `ChatDiscardGuard`); shared chrome lives in `components/`. `MainLayout` composes session → conversation → discard providers around the shell.
- **Product-live gate:** `main.tsx` fetches `IS_PRODUCT_LIVE` once before render; when disabled/unreachable, `/` and unknown paths redirect to `/unavailable`.
- **Styling:** CSS Modules only — no Tailwind, CSS-in-JS, or styled-components.
- Tests mirror `src/` under `frontend/tests/`; use the custom `render` in `test-utils.tsx` so Router/context wiring lives in one place.

### CDM (`packages/cdm/`)

- No I/O, no side effects, no external dependencies — pure types, constants, and lightweight derived data (e.g. `Object.values(...)` lookup maps).
- Every new API contract type (request/response shapes, error codes) belongs here, not duplicated in backend or frontend.
- Rebuild after changes: `npm run build:cdm`.

## Conventions

### Naming and typed constants

- Files camelCase; classes PascalCase; constants UPPER_SNAKE_CASE.
- Types/interfaces: PascalCase, never `I`-prefixed (enforced by ESLint `@typescript-eslint/naming-convention` in both packages — `Logger`, not `ILogger`).
- **Fixed string domains** (routes, roles, UI states, wire tokens, shared header names) use an `as const` object + derived union type, never a raw string literal scattered across files or a TS `enum`:

  ```typescript
  export const MyDomain = { Foo: 'foo', Bar: 'bar' } as const;
  export type MyDomain = (typeof MyDomain)[keyof typeof MyDomain];
  ```

  Object name matches the type name (PascalCase) so call sites read `MyDomain.Foo`. Where the value lives: API-contract-level (error codes, shared headers) → `@chatxiv/cdm`; backend-only (env names, CORS/security names) → `backend/src/lib/config/constants.ts`; frontend-only (routes, theme modes) → a small module next to the feature (e.g. `lib/appRoutes.ts`).
  - Exceptions where plain literals are fine: user-visible copy, log/error messages for humans, boundary parsing of unknown env/JSON, one-off test fixtures.
  - Vite/Babel gotcha: don't write `import { Foo, type Foo }` when a value and its derived type share a name — Babel errors with "already been declared." Use `import { Foo }` only (TS still allows it in type position); re-export the type separately with `export type { Foo } from './module'`.

### No barrel files

Don't add new `index.ts`/`index.tsx` files whose job is only to re-export siblings, and don't grow existing ones with more `export * from` indirection — import the file that defines the symbol (e.g. `import { x } from './foo/feature.js'`, not `from './foo/index.js'`). Reasons: clearer dependency graph, working jump-to-definition, fewer merge conflicts, explicit tree-shaking.

- Exception: `@chatxiv/cdm`'s single `src/index.ts` re-export is the package's intentional public API surface — that's normal package design, not the pattern this avoids.
- Legacy `index.ts` barrels already in the tree (some UI folders) shouldn't be expanded for new code, but removing them is welcome when it's in scope for the task at hand.

### Code style

- Prettier: single quotes, `es5` trailing commas, 100 print width.
- No `console.log` in request-handling code — Pino in backend, `logger` in frontend. `console.error` is fine only in pre-boot startup code where the logger doesn't exist yet.

### Testing

- **Unit tests** (default): one module in isolation, dependencies mocked. **Integration tests**: a full slice (HTTP → middleware → route → service → store) — keep these few and only for verifying cross-layer wiring.
- Route and middleware tests should be unit tests with injected mock services, not real stores, so they survive a storage swap (e.g. in-memory → Redis) unchanged.
- Shared mock factories live in `<package>/tests/mocks/<Interface>.mock.ts`, each exporting `createMock<Interface>()` returning `Mocked<Interface>` (vitest's `Mocked<T>` — preserves the interface contract while exposing `.mockResolvedValue()` etc. on every method). Use a shared factory when an interface is consumed by 2+ test files or is a core domain interface; inline mocks are fine for trivial, test-specific stubs (e.g. a one-off req/res).
- Layer-by-layer mock strategy: **route** → mock service injected into the router factory, assert HTTP status/response shape/service calls; **middleware** → mock strategy/store or inline req/res, assert `next()` and error propagation; **service** → real in-memory store, assert business logic; **store** → no mocks, these are the implementation, assert CRUD correctness; **DI container** → no mocks, verifies real wiring/tokens/singleton identity.
- Route unit tests mount the router factory on a minimal Express app (`express.json()` + the router + `errorHandler()`) — no DI container, no global middleware.
- Coverage threshold is 90%, enforced per package; entry points and test files are excluded so it applies to application source only.

### Engineering standards

Security > reliability > maintainability > extensibility, in that priority order when they trade off against each other:

- **Security** — validate inputs, sanitize outputs, never trust external data, no hardcoded secrets.
- **Reliability** — comprehensive error handling, never swallow errors, graceful degradation.
- **Maintainability** — self-documenting code, meaningful names, small focused functions.
- **Extensibility** — abstractions that make future features easy to add without rewriting existing code.

DRY when logic is non-trivial or repeats 3+ times; YAGNI on features, but do design abstractions/interfaces that leave room for what's clearly coming; keep routing/validation/business-logic/data-access as separate layers; compose rather than build deep class hierarchies; talk to direct dependencies only (Law of Demeter); validate and fail fast at boundaries; a function either does something or returns something, not both. Type safety: no `any`, prefer `unknown`, avoid type assertions unless unavoidable. Suggest new dependencies but always ask before adding one — check existing deps first, weigh maintenance/bundle/license.

- **Tangible constants:** a named constant fixes the "what does this number mean" problem but not the "is this number right" problem — `86_400 as const` is still opaque at the call site. Prefer expressing the value in terms a reader can verify at a glance: `24 * 60 * 60` (or a small `SECONDS_PER_DAY` helper) over a raw literal, `RATE_LIMIT_BURST * 2` over a second unrelated magic number, etc. Applies most to time/duration and size constants, where the unit conversion is exactly what's easy to get wrong.

## Workflow

- **Critical thinking first:** before implementing, check that existing docs/specs/conventions actually match the current code — flag contradictions rather than building on a stale assumption, and raise it if a convention looks wrong given current code or practice rather than blindly following it. Prefer asking one good question over making one bad assumption, especially when starting from a `docs/tasks/` spec.
- **Branch freshness:** before starting implementation work, run `git fetch origin main && git log HEAD..origin/main --oneline`. If `main` has commits this branch doesn't, warn the user and propose (don't execute unprompted): `git reset --soft HEAD~N` → `git stash` → `git pull origin main` → `git stash pop` → resolve conflicts and re-commit. This keeps the branch's own commits as the only history in the PR, no merge commits from catching up.
- **Verify before commit:** after a logical chunk of source (`.ts`/`.tsx`/`.css`/`.json` under `backend/src/` or `frontend/src/`) changes, run `npm run format && npm run lint && npm run test:coverage && npm run build && npm run audit` from root, fixing failures as they come up rather than bypassing the Husky pre-commit hook that runs the same sequence. Non-code-only changes (docs, config, `.md`) can skip this pipeline.
- **Commit messages:** one imperative-mood sentence, ≤72 characters, `feat:`/`fix:`/`refactor:`/`test:`/`docs:`/`chore:` prefix, no multi-line body unless asked, no AI attribution trailers.
- **Pull requests:** fill out `.github/PULL_REQUEST_TEMPLATE.md` (Overview / Revision N / Testing) as a copyable summary once the branch is ready — this mirrors `.cursor/skills/commit-and-pr/SKILL.md` so the PR looks the same regardless of which tool prepared it. Pre-check only the Testing items actually verified this session; leave "CI passes on git" unchecked until after push. On a follow-up push or review pass, add a new `## Revision N+1` section rather than editing or deleting prior `## Revision N` sections — those record what shipped in that iteration.
- **PR size:** keep each PR to one reviewable, mergeable unit — one resolver, one route, one layer of a pipeline — not several stacked concerns bundled because they were built in the same session. Before opening a PR, ask "could this ship and be reviewed on its own?"; if a task naturally splits into independent pieces (e.g. a cache layer, the resolver that consumes it, and the DI wiring that connects them), propose splitting into sequential PRs — even if a later one has to wait on an earlier one to merge first — rather than shipping them as one large diff. If scope grows mid-implementation past the original ask, stop and propose splitting off the overflow into its own branch/PR rather than folding it in.
- **PR metadata:** when opening a PR (`gh pr create`), assign it to the repo owner (`gh pr edit <n> --add-assignee <login>`) and apply whichever labels from `gh label list` actually fit (check what similar merged PRs used — e.g. `backend`/`frontend` for the area, `enhancement`/`bug fix`/`documentation`/`dependencies` for the kind), plus a milestone from `gh api repos/{owner}/{repo}/milestones` if one clearly matches the work (`gh pr edit <n> --milestone "<title>"`). Skip a milestone rather than guessing if none fits.
- **Docs stay in sync with code:** when a change affects behavior documented in `docs/README.md` or `frontend/src/README.md`, update the doc in the same change rather than leaving it stale. New env vars need `backend/.env.example` and `environment.d.ts` updated together with the code.
- **Secrets:** never suggest, stage, or write real values into `.env`/`.env.local`/`.env.production`, API keys/tokens/OAuth secrets, key material (`*.pem`, `*.key`, `id_rsa`, service-account JSON), or tunnel/edge credentials (Cloudflare tunnel `*.json`, ngrok authtokens) — tracked env templates (`.env.example`) get dummy placeholders only, never real values "so it works for everyone." If a diff shows `sk-`, `Bearer `, a long base64 secret, or `-----BEGIN`, stop and require removal before committing. If a secret already landed in git history, the fix is rotate/revoke immediately, then `git revert` or a history rewrite (`git filter-repo`/BFG) per the team's policy — flag that clones/forks may retain old objects until a force-push and GC.
- `docs/design-documents/` and `docs/tasks/` are git-crypt encrypted and may be unreadable without the key (see `docs/git-crypt-setup.md`).

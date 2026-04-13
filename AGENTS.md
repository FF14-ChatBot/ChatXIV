# AGENTS.md

ChatXIV is an FFXIV data chatbot. See `docs/README.md` for developer setup, commands, and project structure.

## Architecture

- **Monorepo** with npm workspaces: `backend/` (Express + TypeScript), `frontend/` (React + Vite), `packages/cdm/` (shared API types)
- Task specs in `docs/tasks/backend/` and `docs/tasks/frontend/` (git-crypt encrypted; may not be readable)
- PR template in `.github/PULL_REQUEST_TEMPLATE.md`

## Conventions

- For fixed string domains (routes, roles, wire values), use an `as const` object plus derived union type — see `.cursor/rules/typed-string-constants.mdc`. Prefer `@chatxiv/cdm` for anything that is part of the API contract.
- Avoid barrel files (`index.ts` / `index.tsx` that only re-export siblings); import from the defining module — see `.cursor/rules/no-barrel-files.mdc`.

## Hard Constraints

- Do not lower the 90% coverage thresholds in `vitest.config.ts`
- Do not skip `.js` extensions in backend ESM imports
- Do not duplicate types that belong in `@chatxiv/cdm`
- Do not add TSyringe DI to stateless utility functions; plain exported functions are preferred
- Do not use `console.log` in request-handling code (use Pino logger in backend, `logger` in frontend)
- Do not use Tailwind, CSS-in-JS, or styled-components; use CSS Modules (`.module.css`) for component styles
- Do not commit `.env` files or secrets

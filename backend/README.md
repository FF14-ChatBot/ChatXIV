# ChatXIV backend

Express + TypeScript API. Run `npm run dev` from this package (or `npm run dev:backend` from the repo root). Default base URL: `http://localhost:3000`.

## API documentation (OpenAPI + Swagger UI)

| What                    | URL                                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------------- |
| **Public Swagger UI**   | `http://localhost:3000/v1/docs/` (trailing slash avoids a redirect)                                       |
| **Admin Swagger UI**    | `http://localhost:3000/v1/admin/docs/` — requires `X-Admin-Key` on the request (see below)                |
| **Public OpenAPI YAML** | `http://localhost:3000/v1/openapi.yaml` — public routes only (no `/v1/admin/*`)                           |
| **Full OpenAPI YAML**   | `http://localhost:3000/v1/admin/openapi.yaml` — same as repo `openapi.admin.yaml`; requires `X-Admin-Key` |

Repo sources: [`openapi/openapi.public.yaml`](openapi/openapi.public.yaml) and [`openapi/openapi.admin.yaml`](openapi/openapi.admin.yaml). Update the file that matches the surface you changed (public vs admin), in the same PR as the code.

After `npm run build`, both YAML files are copied to `dist/openapi/` so production `npm start` can still serve them.

### Admin Swagger in the browser

`/v1/admin/docs/` is protected by the same middleware as the rest of `/v1/admin/*`. A normal browser navigation does **not** send `X-Admin-Key`, so you will get **401** unless you add the header (e.g. a browser extension such as ModHeader) or open the UI via a tool that can set headers. The admin spec is **inlined** in the Swagger page so the UI does not need a second unauthenticated fetch for the YAML. **Try it out** still uses **Authorize** with `X-Admin-Key` for API calls.

## Common headers

| Header                                            | When                                                                                     |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `Content-Type: application/json`                  | Requests with a JSON body (`PUT /v1/admin/flags/:name`).                                 |
| `X-Admin-Key: <secret>`                           | **Required** for `/v1/admin/*`. Use the same value as `ADMIN_API_KEY` in `backend/.env`. |
| `X-Request-Id`, `X-Session-Id`, `Idempotency-Key` | Optional; allowed by CORS for future/chat flows.                                         |

Public flag routes (`GET /v1/flags`, `GET /v1/flags/:name`) do not require auth and are **not** rate-limited (along with `/health`, `/v1/docs`, `/v1/openapi.yaml`, and `/v1/admin/*`).

### Swagger UI: server dropdown and admin **Try it out**

1. **`ADMIN_API_KEY`** must be set in **`backend/.env`** (not only the repo root `.env`). **Save the file** after editing — unsaved buffer changes are not read by Node. In local dev, that key is aligned with the file on disk when the process starts (not when `NODE_ENV` is `production` or `test` at startup). Restart after changing it.
2. **Server dropdown** (top of Swagger): choose the URL that matches where the API actually runs. On a deployed host (e.g. `https://dev-api.chatxiv.com/v1/docs/`), use **Same host** (`/`) or the matching `https://…` entry — **not** `localhost` or `127.0.0.1` (the browser would call your own machine, not the server). For local Swagger, pick **`http://localhost:3000`** or **`http://127.0.0.1:3000`** to match your address bar.
3. On **`/v1/admin/docs/`**, send **`X-Admin-Key`** with the page request if your browser/tool allows it; use **Authorize** in Swagger for **Try it out** on admin operations.

## curl examples

Replace `BASE` and `ADMIN_KEY` as needed.

```bash
# Health
curl -sS "$BASE/health"

# Public OpenAPI YAML only
curl -sS "$BASE/v1/openapi.yaml" -o chatxiv-openapi-public.yaml

# Full OpenAPI YAML (admin paths included)
curl -sS -H "X-Admin-Key: $ADMIN_KEY" "$BASE/v1/admin/openapi.yaml" -o chatxiv-openapi-full.yaml

# List flags (public)
curl -sS "$BASE/v1/flags"

# Get one flag (public); unknown names return enabled: false
curl -sS "$BASE/v1/flags/my-feature"

# Admin: list flags
curl -sS -H "X-Admin-Key: $ADMIN_KEY" "$BASE/v1/admin/flags"

# Admin: enable or create a flag
curl -sS -X PUT "$BASE/v1/admin/flags/my-feature" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: $ADMIN_KEY" \
  -d '{"enabled":true}'

# Admin: delete a flag
curl -sS -X DELETE -H "X-Admin-Key: $ADMIN_KEY" "$BASE/v1/admin/flags/my-feature"
```

Example with defaults:

```bash
BASE=http://localhost:3000
ADMIN_KEY=your-admin-key-from-env
```

## Postman

1. **Import spec:** **Import** → **Link** → `http://localhost:3000/v1/openapi.yaml` for the **public** contract, or use **Link** with `http://localhost:3000/v1/admin/openapi.yaml` and configure Postman to send header `X-Admin-Key` for the **full** spec (or paste the YAML from curl).
2. **Base URL:** Set a collection or environment variable (e.g. `baseUrl` = `http://localhost:3000`).
3. **Admin requests:** Add collection header `X-Admin-Key` = value of `ADMIN_API_KEY` from `backend/.env` (see [`.env.example`](.env.example)).

If Postman does not resolve variables inside the imported `servers` URL, override the request URL or define a server in your environment.

## Errors

JSON error bodies follow the shared shape `ApiErrorResponse` in `@chatxiv/cdm` (`code`, `message`, optional `requestId`). Typical cases:

- **401** on admin routes: missing or wrong `X-Admin-Key`.
- **400** with `VALIDATION_ERROR`: bad flag name pattern or invalid JSON body (`enabled` must be a boolean).

## Developer commands

See the repo root [docs/README.md](../docs/README.md) for install, lint, test, coverage, and build across workspaces.

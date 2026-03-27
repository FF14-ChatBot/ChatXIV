# Frontend source layout

- **clients/** – HTTP clients for external services. **clients/core/** is the generic fetch wrapper (`request`), shared **`HTTP_METHOD`** / **`HttpMethod`**, and types—no per-API error mapping. **clients/chatxivApi/** is the ChatXIV app API client (`chatxivApiRequest()`, `ApiClientError`). Each backend gets its own named folder and request function (e.g. future `clients/authApi/` with `authApiRequest`). Import directly from the source file (e.g. `clients/chatxivApi/instance`, `clients/chatxivApi/client`).
- **components/** – Shared chrome and cross-cutting UI (e.g. `MainLayout`, `AppShell`, `Header`, `ErrorBoundary`, `GlobalErrorHandler`). Prefer composition over large single-file components.
- **context/** – App-wide React context (e.g. `ProductNavigationContext` supplies `homeHref` so the header’s home/logo targets `/unavailable` instead of `/` when the product-live gate blocks the chat route).
- **features/** – Route-scoped product modules. **features/chat/** holds the chat screen (`ChatPage`), `ChatSessionContext` (generation + `landing`: welcome hero vs thread with an opening bot line for header “New Chat”), `ChatConversationContext` (message state; `isEphemeralDirty` when the user has sent a message or has non-empty composer text), `ChatDiscardGuard` (confirm dialog + `beforeunload`), and chat-only UI (composer, welcome panel). `MainLayout` wraps the shell with session → conversation → discard providers. **`AppShell`** wraps `NotAvailablePage` and **`LoginPage`** (`/login`) with `ChatDiscardGuardStub` + `Header` + footer so admins can sign in while the chat route is gated. The header omits **New Chat** on `/unavailable` and `/login` (no chat session there); use **Home** or `/` for the main app. Wire routes in `App.tsx`. `/unavailable` uses `NotAvailablePage` with `showHomeLink` from the same product-live gate as redirects (no flag import on that page); when gated, the page also links to `/login`. `main.tsx` fetches `IS_PRODUCT_LIVE` once before render and passes `isProductLive` into `App` (all modes; failures treat as not live). Unknown paths redirect to `/unavailable` when gated. Optional **AdSense:** publisher + display slots in `lib/adsense/adsenseConfig.ts` (see `frontend/.env.example`). `main.tsx` loads `adsbygoogle.js` when `getAdsenseClient()` resolves; `ChatAdSlot` uses `lib/adsense/adsenseRegistry.ts` for placement → slot.
- **hooks/** – Reusable React hooks (e.g. `useChatConversation` for message state + `ChatAssistantPort`, `useSessionId` for API config). `hooks/useTheme.ts` re-exports `ThemeProvider` / `useTheme` from `theme/ThemeProvider.tsx` for a stable import path.
- **theme/** – Theme provider implementation (`ThemeProvider`, `useTheme`); `main.tsx` may import from here directly for boot clarity.
- **config/** – Pure configuration (e.g. `starterPrompts`), no React.
- **lib/chat/** – Chat-side abstractions that are not React-specific (e.g. `ChatAssistantPort` + demo implementation; swap for API-backed implementation when `/v1/ask` or equivalent exists in CDM).
- **test-utils.tsx** – Custom `render` with optional wrapper. Use for new tests so Router/context live in one place.
- **Tests** – Spec files live under `frontend/tests/`, mirroring `src/` (e.g. `src/features/chat/...` → `tests/features/chat/...`). Vitest resolves `@/` to `src/` (see `vitest.config.ts`).

---

## How the API client works

When the app talks to the ChatXIV API (or later, other backends), it goes through two layers: a **generic HTTP layer** (core) and a **per-backend layer** (e.g. chatxivApi). Only the per-backend layer knows that API’s error format and user-facing messages.

### One client per backend (future-proof)

There is no single “backend” client. Each backend has a **named** client so multiple backends can coexist:

| Client         | Folder                | Request function      | Use case           |
| -------------- | --------------------- | --------------------- | ------------------ |
| ChatXIV API    | `clients/chatxivApi/` | `chatxivApiRequest()` | Main app API       |
| (future) Auth  | `clients/authApi/`    | `authApiRequest()`    | Auth service       |
| (future) Other | `clients/otherApi/`   | `otherApiRequest()`   | Any other HTTP API |

You import the client you need: `chatxivApiRequest` for the ChatXIV API, and later `authApiRequest` for auth. Each has its own config type and env (e.g. `VITE_CHATXIV_BACKEND_URL` for ChatXIV, `VITE_AUTH_BACKEND_URL` for auth).

### What you use in the app (ChatXIV API)

- **Boot:** `main.tsx` calls `setChatxivApiClient(createChatxivApiClient())`, reads `isProductLive` from `fetchFeatureFlagEntry(IS_PRODUCT_LIVE)`, then renders `<App isProductLive={…} />`. Tests pass `isProductLive` into `App` directly.
- **Import:** `chatxivApiRequest` from `clients/chatxivApi/instance`, `ApiClientError` from `clients/chatxivApi/errors/ApiClientError`.
- **Call:** `chatxivApiRequest('POST', '/v1/ask', { body: { query: '...' }, config: { getSessionId: () => sessionId } })`.
- **Result:** Parsed JSON body, or a thrown `ApiClientError` with a safe `displayMessage` for the UI.

You never call the core directly from app code. The core is used only inside each client module. The client implements `ChatxivApiClient`; swap implementations at boot to use a different backend or a test double.

### Two layers

| Layer           | Folder                | Role                                                                                                                                                                                      |
| --------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Core**        | `clients/core/`       | Builds URL, adds headers you pass in, runs `fetch`, returns raw `Response`. No status or error parsing. Any backend can use it.                                                           |
| **ChatXIV API** | `clients/chatxivApi/` | Uses core to do the request. Adds X-Request-Id and X-Session-Id. On 4xx/5xx, parses CDM error body and throws `ApiClientError` with user-facing message. On success, returns parsed JSON. |

So: **core** = “do the request and give me the response.” **chatxivApi** (and any other client) = “do the request via core, then interpret success vs. error for that API.”

### Flow when you call `chatxivApiRequest`

1. **Config** – ChatXIV client gets base URL (`VITE_CHATXIV_BACKEND_URL` or same-origin) and optional `getSessionId()` for the X-Session-Id header. Feature flags use `fetchFeatureFlagEntry()` in `clients/chatxivApi/featureFlags.ts` with CDM name constants (e.g. `IS_PRODUCT_LIVE`).
2. **Headers** – Builds headers (Content-Type, X-Request-Id, optional X-Session-Id) and passes them to the core via `getHeaders`.
3. **HTTP** – Core builds URL, calls `fetch`, returns `Response` to the client.
4. **Network failure** – Client catches and throws `ApiClientError` with a generic message.
5. **HTTP error (4xx/5xx)** – Client parses body as CDM, maps `code` to user-facing message, throws `ApiClientError`.
6. **Success** – Client parses JSON and returns; caller gets typed data or `undefined` for 204 / non-JSON.

When you add a new `ERROR_CODES` value in `@chatxiv/cdm`, add a matching entry in `clients/chatxivApi/errors/messages.ts` (`ERROR_CODE_TO_MESSAGE`); tests assert every CDM code has a user-facing string.

So from the UI’s point of view: call `chatxivApiRequest`, get data or a single error type (`ApiClientError`) with a safe message to show.

### Production domain example (chatxiv.com)

- Frontend origin: `https://www.chatxiv.com`
- Backend API origin: `https://api.chatxiv.com`
- Frontend env at build time:
  - `VITE_CHATXIV_BACKEND_URL=https://api.chatxiv.com`
  - Product live: every boot calls the API for `isProductLive` (`IS_PRODUCT_LIVE` in CDM). When disabled or unreachable, `/` and unknown paths redirect to `/unavailable`; enable the flag per environment when ready. `/unavailable` still renders directly.
- Backend CORS must allow:
  - `https://www.chatxiv.com`

### Adding another backend

To add a second (or third) backend:

1. **Create a new folder** under `clients/`, e.g. `clients/authApi/`.
2. **Add config** – e.g. `getAuthApiBaseUrl()` reading `VITE_AUTH_BACKEND_URL`.
3. **Add types** – e.g. `AuthApiConfig` (baseUrl, getToken, etc.).
4. **Use the core** – call `request()` from `clients/core` with your baseUrl and a `getHeaders` that adds that API’s required headers (e.g. `Authorization: Bearer …`).
5. **Handle response** – check `response.ok`, parse body in that API’s format, throw your own error type (or a generic one). You don’t use CDM or `ApiClientError` unless that API uses the same shape.
6. **Export** – e.g. `authApiRequest` and `AuthApiConfig` from their respective source files in `clients/authApi/`. Import directly from source files; do not use barrel `index.ts` re-exports.

The core stays generic; each backend client is a thin wrapper with its own config, headers, and error handling.
